from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.authtoken.models import Token
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AREAS,
    FURNISHING,
    PROPERTY_TYPES,
    TITLE_DOCUMENTS,
    Agent,
    House,
    HouseImage,
    Payment,
    Unlock,
)
from .payments import CardError, check_test_card, new_reference
from .serializers import (
    AgentHouseSerializer,
    AgentMeSerializer,
    AgentPublicSerializer,
    AgentSignupSerializer,
    HouseFullSerializer,
    HousePreviewSerializer,
    HouseWriteSerializer,
    ImageUploadSerializer,
    SignupSerializer,
)

# How many listings an agent can prepare before you have verified them.
# This stops a stranger from filling the site with junk. Change the number if you like.
UNVERIFIED_LISTING_LIMIT = 3
MAX_PHOTOS_PER_HOUSE = 20
MAX_PHOTO_MB = 10


def public_houses():
    # A house is public only if it is approved AND its agent is verified.
    return House.objects.filter(status='approved', agent__is_verified=True)


def can_see_full(user, house):
    """Full details go only to the agent who owns the house, or to someone who unlocked it."""
    if not user.is_authenticated:
        return False
    if house.agent.user_id == user.id:
        return True
    return Unlock.objects.filter(user=user, house=house).exists()


class IsAgent(permissions.BasePermission):
    """Only logged-in people who have an agent profile."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and hasattr(user, 'agent'))


def send_back_for_review_if_live(house):
    # Changing the photos of a live listing sends it back for another look,
    # so a good-looking listing can't be quietly swapped for a misleading one.
    if house.status == 'approved':
        house.status = 'pending'
        house.save(update_fields=['status'])


class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'email': user.email}, status=201)


class AgentSignupView(APIView):
    """An agent applies. They get an account and are logged in, but stay unverified."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AgentSignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        agent = serializer.save()
        token, _ = Token.objects.get_or_create(user=agent.user)
        return Response(
            {
                'token': token.key,
                'email': agent.user.email,
                'business_name': agent.business_name,
            },
            status=201,
        )


class LocationsView(APIView):
    """The open states and their areas, e.g. {"Lagos": ["Ikoyi", ...], "Abuja": [...]}"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(AREAS)


class FormOptionsView(APIView):
    """The choices for the dropdowns on the add-a-house form, so they live only in models.py."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                'property_types': PROPERTY_TYPES,
                'furnishing': FURNISHING,
                'title_documents': TITLE_DOCUMENTS,
            }
        )


class HouseListView(generics.ListAPIView):
    serializer_class = HousePreviewSerializer

    def get_queryset(self):
        queryset = public_houses()
        params = self.request.query_params
        state = params.get('state')
        area = params.get('area')
        listing_type = params.get('type')  # "rent" or "sale"

        if state:
            queryset = queryset.filter(state=state)
        if area:
            queryset = queryset.filter(area=area)
        if listing_type in ('rent', 'sale'):
            queryset = queryset.filter(listing_type=listing_type)
        return queryset


class HouseDetailView(generics.RetrieveAPIView):
    serializer_class = HousePreviewSerializer

    def get_queryset(self):
        return public_houses()

    def retrieve(self, request, *args, **kwargs):
        house = self.get_object()
        if can_see_full(request.user, house):
            data = HouseFullSerializer(house, context={'request': request}).data
        else:
            data = dict(HousePreviewSerializer(house, context={'request': request}).data)
            data['unlock_fee'] = float(settings.UNLOCK_FEE)
        return Response(data)


class StartPaymentView(APIView):
    """Step 1 of unlocking a house: open a payment and hand back its reference."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        house = get_object_or_404(public_houses(), pk=pk)

        # the agent who owns the house, or someone who already paid, has nothing to buy
        if can_see_full(request.user, house):
            return Response({'already_unlocked': True})

        # The price is decided here, on the server. The website never sends an amount.
        payment = Payment.objects.create(
            reference=new_reference(),
            user=request.user,
            house=house,
            amount=settings.UNLOCK_FEE,
        )
        return Response(
            {
                'already_unlocked': False,
                'reference': payment.reference,
                'amount': float(payment.amount),
            },
            status=201,
        )


class ChargeTestCardView(APIView):
    """Step 2: the pretend card is charged.

    This is the ONLY place where a house gets unlocked. A house is never unlocked just
    because the website says "I paid": the server decides, here, from the card.
    When Paystack is added, this is the step that changes."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, reference):
        # a person can only ever touch their own payments
        payment = get_object_or_404(Payment, reference=reference, user=request.user)
        house = payment.house

        if payment.status == 'success':
            # already paid (for example a double click): never charge twice
            return Response(self.receipt(payment, request))
        if payment.status == 'failed':
            return Response({'detail': 'This payment has ended. Please start again.'}, status=409)
        if house.status != 'approved' or not house.agent.is_verified:
            return Response({'detail': 'This house is no longer available.'}, status=409)

        try:
            goes_through, message, last4 = check_test_card(
                request.data.get('card_number'),
                request.data.get('expiry'),
                request.data.get('cvv'),
            )
        except CardError as error:
            # A typo is not a payment attempt, so the payment stays open for another try.
            return Response({'detail': str(error)}, status=400)

        payment.card_last4 = last4

        if not goes_through:
            payment.status = 'failed'
            payment.failure_reason = message
            payment.save(update_fields=['status', 'failure_reason', 'card_last4'])
            return Response({'detail': message}, status=402)

        # Paid. Mark the payment and unlock the house together, or neither.
        with transaction.atomic():
            unlock, _ = Unlock.objects.get_or_create(
                user=request.user,
                house=house,
                defaults={'amount': payment.amount},
            )
            payment.status = 'success'
            payment.paid_at = timezone.now()
            payment.unlock = unlock
            payment.save(update_fields=['status', 'paid_at', 'card_last4', 'unlock'])

        return Response(self.receipt(payment, request))

    def receipt(self, payment, request):
        return {
            'reference': payment.reference,
            'amount': float(payment.amount),
            'paid_at': payment.paid_at,
            'house': HouseFullSerializer(payment.house, context={'request': request}).data,
        }


class AgentDetailView(generics.RetrieveAPIView):
    queryset = Agent.objects.filter(is_verified=True)
    serializer_class = AgentPublicSerializer


class AgentHouseListView(generics.ListAPIView):
    serializer_class = HousePreviewSerializer

    def get_queryset(self):
        return public_houses().filter(agent_id=self.kwargs['agent_id'])


# ---------- The agent dashboard (agents only) ----------

class AgentMeView(APIView):
    """The logged-in agent's own profile and how many listings they have."""
    permission_classes = [IsAgent]

    def get(self, request):
        agent = request.user.agent
        data = dict(AgentMeSerializer(agent).data)
        data['listing_count'] = agent.houses.count()
        data['listing_limit'] = None if agent.is_verified else UNVERIFIED_LISTING_LIMIT
        return Response(data)


class AgentHousesView(APIView):
    """List the agent's own houses (every status), or add a new one."""
    permission_classes = [IsAgent]

    def get(self, request):
        houses = House.objects.filter(agent=request.user.agent).prefetch_related('images')
        serializer = AgentHouseSerializer(houses, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        agent = request.user.agent

        if not agent.is_verified and agent.houses.count() >= UNVERIFIED_LISTING_LIMIT:
            return Response(
                {
                    'detail': (
                        f'Until you are verified, you can prepare up to '
                        f'{UNVERIFIED_LISTING_LIMIT} listings.'
                    )
                },
                status=403,
            )

        serializer = HouseWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Every new house starts as "pending". Only you can approve it, in the admin.
        house = serializer.save(agent=agent, status='pending')

        data = AgentHouseSerializer(house, context={'request': request}).data
        return Response(data, status=201)


class AgentHouseDetailView(APIView):
    """Read, change or delete one of the agent's own houses."""
    permission_classes = [IsAgent]

    def get(self, request, pk):
        # every detail of the house, so the edit form can be filled in
        house = get_object_or_404(House, pk=pk, agent=request.user.agent)
        data = dict(HouseWriteSerializer(house).data)
        data['id'] = house.id
        return Response(data)

    def put(self, request, pk):
        house = get_object_or_404(House, pk=pk, agent=request.user.agent)

        serializer = HouseWriteSerializer(house, data=request.data)
        serializer.is_valid(raise_exception=True)
        house = serializer.save()

        # Any change goes back to review. This is also how an agent fixes a rejected
        # listing and sends it again. Only you can approve it, in the admin.
        if house.status != 'pending':
            house.status = 'pending'
            house.save(update_fields=['status'])

        data = AgentHouseSerializer(house, context={'request': request}).data
        return Response(data)

    def delete(self, request, pk):
        house = get_object_or_404(House, pk=pk, agent=request.user.agent)

        # Deleting a house would also erase the record of anyone who paid (or tried to pay).
        if house.unlocks.exists() or house.payments.exists():
            return Response(
                {
                    'detail': (
                        "People have already unlocked this house, so it can't be deleted here. "
                        'Please contact us if it needs to be taken down.'
                    )
                },
                status=409,
            )

        house.delete()
        return Response(status=204)


class AgentHouseImagesView(APIView):
    """Add one or more photos to a house the agent owns."""
    permission_classes = [IsAgent]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        house = get_object_or_404(House, pk=pk, agent=request.user.agent)
        files = request.FILES.getlist('images')

        if not files:
            return Response({'detail': 'Choose at least one photo.'}, status=400)
        if house.images.count() + len(files) > MAX_PHOTOS_PER_HOUSE:
            return Response(
                {'detail': f'A house can have up to {MAX_PHOTOS_PER_HOUSE} photos.'},
                status=400,
            )

        # Check every file first, so we never save only some of them.
        for f in files:
            if f.size > MAX_PHOTO_MB * 1024 * 1024:
                return Response({'detail': f'{f.name} is bigger than {MAX_PHOTO_MB} MB.'}, status=400)
            if not ImageUploadSerializer(data={'image': f}).is_valid():
                return Response(
                    {'detail': f"{f.name} isn't a picture we can use. Please use a JPG or PNG."},
                    status=400,
                )

        # The first photo a house gets becomes its cover photo.
        has_cover = house.images.filter(is_cover=True).exists()
        for index, f in enumerate(files):
            HouseImage.objects.create(house=house, image=f, is_cover=(not has_cover and index == 0))

        send_back_for_review_if_live(house)
        data = AgentHouseSerializer(house, context={'request': request}).data
        return Response(data, status=201)


class AgentHouseImageDetailView(APIView):
    """Remove one photo from a house the agent owns."""
    permission_classes = [IsAgent]

    def delete(self, request, pk, image_id):
        image = get_object_or_404(
            HouseImage, pk=image_id, house_id=pk, house__agent=request.user.agent
        )
        house = image.house
        was_cover = image.is_cover

        image.image.delete(save=False)  # remove the file itself as well
        image.delete()

        # if the cover photo went, the next photo takes its place
        if was_cover:
            next_image = house.images.first()
            if next_image:
                next_image.is_cover = True
                next_image.save(update_fields=['is_cover'])

        send_back_for_review_if_live(house)
        data = AgentHouseSerializer(house, context={'request': request}).data
        return Response(data)