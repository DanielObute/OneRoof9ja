import mimetypes

from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.db import transaction
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .identity import (
    ID_TYPES,
    MAX_ATTEMPTS,
    REJECTION_REASONS,
    IdentityError,
    clean_id_number,
    clean_id_type,
    clean_nin,
    looks_like_live_strip,
    nin_fingerprint,
    run_test_check,
)
from .models import IdentityVerification
from .serializers import ImageUploadSerializer
from .views import IsAgent

mimetypes.add_type('image/avif', '.avif')
MAX_FILE_MB = 10


def identity_info(agent):
    """What an agent may see about their own identity check. Never the pictures or the NIN."""
    record = getattr(agent, 'identity', None)
    if record is None:
        return {
            'status': 'none',
            'attempts': 0,
            'attempts_left': MAX_ATTEMPTS,
            'can_submit': True,
            'id_types': ID_TYPES,
        }

    attempts_left = max(MAX_ATTEMPTS - record.attempts, 0)
    return {
        'status': record.status,
        'status_label': record.get_status_display(),
        'id_type_label': record.get_id_type_display(),
        'nin_last4': record.nin_last4,
        'id_number_last4': record.id_number_last4,
        'provider_result': record.provider_result,
        'provider_result_label': record.get_provider_result_display(),
        'face_match_score': record.face_match_score,
        'rejection_reason': record.rejection_reason,
        'submitted_at': record.submitted_at,
        'attempts': record.attempts,
        'attempts_left': attempts_left,
        'can_submit': record.status == 'rejected' and attempts_left > 0,
        'id_types': ID_TYPES,
    }


class IdentityView(APIView):
    """An agent's own identity check: see where it stands (GET), or submit it (POST)."""
    permission_classes = [IsAgent]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        return Response(identity_info(request.user.agent))

    def post(self, request):
        agent = request.user.agent
        record = getattr(agent, 'identity', None)

        if record is not None and record.status in ('submitted', 'approved'):
            return Response(
                {'detail': 'Your identity has already been submitted, so it cannot be changed.'},
                status=409,
            )
        if record is not None and record.attempts >= MAX_ATTEMPTS:
            return Response(
                {'detail': 'You have used all of your attempts. Please contact us.'}, status=409
            )

        # 1) the details
        try:
            nin = clean_nin(request.data.get('nin'))
            id_type = clean_id_type(request.data.get('id_type'))
            id_number = clean_id_number(request.data.get('id_number'))
        except IdentityError as error:
            return Response({'detail': str(error)}, status=400)

        if str(request.data.get('consent', '')).lower() != 'true':
            return Response({'detail': 'Please confirm your consent to continue.'}, status=400)

        # 2) the (pretend) provider looks at the NIN. Real NINs are refused in test mode.
        try:
            result, score = run_test_check(nin)
        except IdentityError as error:
            return Response({'detail': str(error)}, status=400)

        # 3) one NIN, one agent account
        fingerprint = nin_fingerprint(nin, settings.SECRET_KEY)
        if IdentityVerification.objects.filter(nin_fingerprint=fingerprint).exclude(agent=agent).exists():
            return Response(
                {'detail': 'This NIN is already linked to another agent account.'}, status=400
            )

        # 4) the pictures
        id_front = request.FILES.get('id_front')
        id_back = request.FILES.get('id_back')
        selfie = request.FILES.get('selfie')

        if id_front is None:
            return Response({'detail': 'Upload the front of your ID.'}, status=400)
        if selfie is None:
            return Response({'detail': 'Take a selfie to continue.'}, status=400)

        for label, upload in (
            ('The front of your ID', id_front),
            ('The back of your ID', id_back),
            ('Your selfie', selfie),
        ):
            if upload is None:
                continue
            if upload.size > MAX_FILE_MB * 1024 * 1024:
                return Response(
                    {'detail': f'{label} is bigger than {MAX_FILE_MB} MB.'}, status=400
                )
            if not ImageUploadSerializer(data={'image': upload}).is_valid():
                return Response(
                    {'detail': f"{label} isn't a picture we can use. Please use a JPG or PNG."},
                    status=400,
                )

        # the selfie has to come from the live check on the website, not from an uploaded photo
        if not looks_like_live_strip(selfie):
            return Response(
                {
                    'detail': (
                        'Your selfie must be taken live with the camera on this page. '
                        'Uploaded photos are not accepted.'
                    )
                },
                status=400,
            )

        # 5) save it
        now = timezone.now()
        with transaction.atomic():
            if record is None:
                record = IdentityVerification(agent=agent)
            else:
                # a new try replaces the pictures from the last one
                for stored in (record.selfie, record.id_front, record.id_back):
                    if stored:
                        stored.delete(save=False)

            record.nin_fingerprint = fingerprint
            record.nin_last4 = nin[-4:]
            record.id_type = id_type
            record.id_number_last4 = id_number[-4:]
            record.id_front = id_front
            if id_back is not None:
                record.id_back = id_back
            record.selfie = selfie
            record.provider = 'test'
            record.provider_result = result
            record.face_match_score = score
            record.consent_given_at = now
            record.submitted_at = now
            record.attempts += 1
            record.reviewed_by = None
            record.reviewed_at = None

            if result == 'passed':
                # the pretend check passed, so a person still has to look at the pictures
                record.status = 'submitted'
                record.rejection_reason = ''
            else:
                record.status = 'rejected'
                record.rejection_reason = REJECTION_REASONS[result]

            record.save()

        return Response(identity_info(agent), status=201)


@staff_member_required
def identity_file(request, pk, kind):
    """Shows one of an agent's identity pictures, to admin staff only.
    These files are not in the public media folder, so this is the only way to see them."""
    record = get_object_or_404(IdentityVerification, pk=pk)
    stored = {
        'selfie': record.selfie,
        'id_front': record.id_front,
        'id_back': record.id_back,
    }.get(kind)
    if not stored:
        raise Http404('No such file.')

    content_type = mimetypes.guess_type(stored.name)[0] or 'application/octet-stream'
    response = FileResponse(stored.open('rb'), content_type=content_type)
    response['Cache-Control'] = 'private, no-store'
    response['X-Content-Type-Options'] = 'nosniff'
    return response