from django.contrib import admin, messages
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html

from .models import Agent, House, HouseImage, IdentityVerification, Payment, Unlock


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = [
        'business_name', 'phone', 'state', 'cac_number', 'identity_status', 'is_verified', 'created_at',
    ]
    list_filter = ['is_verified', 'state']
    search_fields = ['business_name', 'phone', 'cac_number', 'user__email']
    actions = ['verify_agents', 'unverify_agents']

    # "Is verified" can't be ticked by hand. An agent becomes verified only when their identity
    # check is approved (see "Identity verifications"), or through the action below.
    readonly_fields = ['is_verified']

    @admin.display(description='Identity check')
    def identity_status(self, obj):
        record = getattr(obj, 'identity', None)
        return record.get_status_display() if record else 'Not submitted'

    @admin.action(description='Verify selected agents (their identity check must be approved first)')
    def verify_agents(self, request, queryset):
        ready = queryset.filter(identity__status='approved')
        skipped = queryset.count() - ready.count()
        ready.update(is_verified=True)
        if skipped:
            self.message_user(
                request,
                f"{skipped} agent(s) were skipped because their identity check hasn't been approved.",
                messages.WARNING,
            )

    @admin.action(description='Remove verification from selected agents')
    def unverify_agents(self, request, queryset):
        queryset.update(is_verified=False)


class HouseImageInline(admin.TabularInline):
    model = HouseImage
    extra = 1


@admin.register(House)
class HouseAdmin(admin.ModelAdmin):
    list_display = ['title', 'listing_type', 'agent', 'state', 'area', 'price', 'status', 'created_at']
    list_filter = ['status', 'listing_type', 'state', 'area']
    search_fields = ['title', 'street', 'agent__business_name']
    inlines = [HouseImageInline]
    actions = ['approve_houses', 'reject_houses']

    fieldsets = [
        ('Shown free to everyone', {
            'fields': [
                'agent', 'title', 'listing_type', 'rent_period', 'state', 'area',
                'price', 'bedrooms', 'bathrooms', 'units_available',
            ],
        }),
        ('Locked: shown only after someone unlocks the house', {
            'fields': [
                'street', 'description', 'property_type', 'living_rooms', 'kitchens',
                'guest_toilets', 'parking_spaces', 'has_boys_quarters', 'plot_size_sqm',
                'floor_area_sqm', 'year_built', 'furnishing', 'amenities',
                'title_document', 'service_charge', 'agency_fee',
            ],
        }),
        ('Review', {
            'fields': ['status'],
        }),
    ]

    @admin.action(description='Approve selected houses')
    def approve_houses(self, request, queryset):
        queryset.update(status='approved')

    @admin.action(description='Reject selected houses')
    def reject_houses(self, request, queryset):
        queryset.update(status='rejected')


@admin.register(Unlock)
class UnlockAdmin(admin.ModelAdmin):
    list_display = ['user', 'house', 'amount', 'paid_at']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['reference', 'user', 'house', 'amount', 'status', 'card_last4', 'created_at']
    list_filter = ['status', 'provider']
    search_fields = ['reference', 'user__username', 'house__title']

    # Payments are history: you can look at them, but not add, change or delete them.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(IdentityVerification)
class IdentityVerificationAdmin(admin.ModelAdmin):
    """Where you look at an agent's ID and selfie, and decide."""
    list_display = [
        'agent', 'status', 'provider_result', 'face_match_score', 'id_type', 'nin_last4',
        'attempts', 'submitted_at',
    ]
    list_filter = ['status', 'provider_result', 'id_type']
    search_fields = ['agent__business_name', 'agent__cac_number', 'agent__user__email']
    actions = ['approve_identities', 'reject_identities']

    fieldsets = [
        ('The agent', {
            'fields': ['agent', 'submitted_at', 'attempts', 'consent_given_at'],
        }),
        ('Automated check (test mode: the result is pretend)', {
            'fields': ['provider', 'provider_result', 'face_match_score'],
        }),
        ('What they sent. Compare the three live poses with the photo on the ID, and the numbers with the ID.', {
            'fields': [
                'id_type', 'id_number_last4', 'nin_last4',
                'selfie_preview', 'id_front_preview', 'id_back_preview',
            ],
        }),
        ('Your decision', {
            'description': (
                'Choose Approved or Rejected, then Save. Approving makes the agent verified. '
                'Before you approve, also check their CAC number on the CAC website.'
            ),
            'fields': ['status', 'rejection_reason', 'reviewed_by', 'reviewed_at'],
        }),
    ]
    readonly_fields = [
        'agent', 'submitted_at', 'attempts', 'consent_given_at',
        'provider', 'provider_result', 'face_match_score',
        'id_type', 'id_number_last4', 'nin_last4',
        'selfie_preview', 'id_front_preview', 'id_back_preview',
        'reviewed_by', 'reviewed_at',
    ]

    def has_add_permission(self, request):
        return False

    @admin.action(description='Approve selected identity checks (the agents become verified)')
    def approve_identities(self, request, queryset):
        approved = 0
        skipped = 0
        for record in queryset.select_related('agent'):
            # only a check that passed the automated test can be approved
            if record.provider_result != 'passed':
                skipped += 1
                continue
            record.status = 'approved'
            record.rejection_reason = ''
            record.reviewed_by = request.user
            record.reviewed_at = timezone.now()
            record.save()
            if not record.agent.is_verified:
                record.agent.is_verified = True
                record.agent.save(update_fields=['is_verified'])
            approved += 1
        if approved:
            self.message_user(
                request, f'{approved} agent(s) approved and now verified.', messages.SUCCESS
            )
        if skipped:
            self.message_user(
                request,
                f'{skipped} were skipped because the automated check did not pass.',
                messages.WARNING,
            )

    @admin.action(description='Reject selected identity checks (with a standard reason)')
    def reject_identities(self, request, queryset):
        rejected = 0
        for record in queryset.select_related('agent'):
            record.status = 'rejected'
            # for a reason of your own, open the record and write it there instead
            if not record.rejection_reason.strip():
                record.rejection_reason = (
                    'Our team could not verify your documents. '
                    'Please check your details and photos, and try again.'
                )
            record.reviewed_by = request.user
            record.reviewed_at = timezone.now()
            record.save()
            if record.agent.is_verified:
                record.agent.is_verified = False
                record.agent.save(update_fields=['is_verified'])
            rejected += 1
        self.message_user(request, f'{rejected} identity check(s) rejected.', messages.WARNING)

    def _preview(self, record, kind, stored, width=340):
        if not stored:
            return '(none)'
        # these files are private: this address works for admin staff only
        url = reverse('identity-file', args=[record.pk, kind])
        return format_html(
            '<a href="{0}" target="_blank"><img src="{0}" alt="" '
            'style="max-width:{1}px;max-height:340px;border-radius:8px;border:1px solid #ccc"></a>',
            url,
            width,
        )

    @admin.display(description='Live selfie (3 poses: straight, left, right)')
    def selfie_preview(self, obj):
        return self._preview(obj, 'selfie', obj.selfie, width=900)

    @admin.display(description='ID, front')
    def id_front_preview(self, obj):
        return self._preview(obj, 'id_front', obj.id_front)

    @admin.display(description='ID, back')
    def id_back_preview(self, obj):
        return self._preview(obj, 'id_back', obj.id_back)

    def save_model(self, request, obj, form, change):
        status_changed = change and 'status' in form.changed_data
        if change and ('status' in form.changed_data or 'rejection_reason' in form.changed_data):
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)

        # Your decision decides whether the agent is verified.
        agent = obj.agent
        if status_changed and obj.status == 'approved' and not agent.is_verified:
            agent.is_verified = True
            agent.save(update_fields=['is_verified'])
            self.message_user(request, f'{agent.business_name} is now a verified agent.', messages.SUCCESS)
        elif status_changed and obj.status != 'approved' and agent.is_verified:
            agent.is_verified = False
            agent.save(update_fields=['is_verified'])
            self.message_user(
                request, f'{agent.business_name} is no longer verified.', messages.WARNING
            )