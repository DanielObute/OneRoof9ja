from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

# Only Lagos and Abuja are open for now.
STATES = [
    ('Lagos', 'Lagos'),
    ('Abuja', 'Abuja'),
]

# The premium areas that are open in each state.
# To open a new area, add its name to the right list below.
# To open a new state, add it to STATES above and give it a list here.
AREAS = {
    'Lagos': ['Banana Island', 'Ikoyi', 'Lekki Phase 1', 'Lekki Phase 2', 'Gbagada', 'Magodo', 'Ikeja'],
    'Abuja': ['Maitama', 'Asokoro'],
}
AREA_CHOICES = [(area, area) for areas in AREAS.values() for area in areas]

LISTING_TYPES = [
    ('rent', 'For rent'),
    ('sale', 'For sale'),
]

RENT_PERIODS = [
    ('year', 'Per year'),
    ('month', 'Per month'),
]

PROPERTY_TYPES = [
    ('detached', 'Detached house'),
    ('semi_detached', 'Semi-detached house'),
    ('terrace', 'Terraced house'),
    ('duplex', 'Duplex'),
    ('apartment', 'Apartment'),
    ('penthouse', 'Penthouse'),
    ('mansion', 'Mansion / villa'),
]

FURNISHING = [
    ('unfurnished', 'Unfurnished'),
    ('semi', 'Semi-furnished'),
    ('furnished', 'Fully furnished'),
]

TITLE_DOCUMENTS = [
    ('c_of_o', 'Certificate of Occupancy (C of O)'),
    ('governors_consent', "Governor's Consent"),
    ('deed', 'Deed of Assignment'),
    ('survey', 'Survey plan only'),
    ('other', 'Other'),
]


class Agent(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    business_name = models.CharField(max_length=150)
    cac_number = models.CharField(max_length=50)
    phone = models.CharField(max_length=20)
    state = models.CharField(max_length=50, choices=STATES)
    areas = models.CharField(max_length=250, help_text='Neighbourhoods, e.g. Ikoyi, Banana Island')
    bio = models.TextField(blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.business_name


class House(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='houses')

    # --- Shown free, to everyone ---
    title = models.CharField(max_length=150)
    listing_type = models.CharField(max_length=10, choices=LISTING_TYPES, default='rent')
    rent_period = models.CharField(
        max_length=10, choices=RENT_PERIODS, default='year',
        help_text='Only used for rentals. Most Nigerian rent is quoted per year.',
    )
    state = models.CharField(max_length=50, choices=STATES)
    area = models.CharField(max_length=100, choices=AREA_CHOICES)
    price = models.DecimalField(
        max_digits=14, decimal_places=2,
        help_text='For sales: the full price. For rentals: the rent for the period chosen above.',
    )
    bedrooms = models.PositiveSmallIntegerField(default=1)
    bathrooms = models.PositiveSmallIntegerField(default=1)
    units_available = models.PositiveIntegerField(default=1)

    # --- Locked: only shown after a house hunter unlocks the house ---
    street = models.CharField(max_length=200)
    description = models.TextField()
    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPES, blank=True)
    living_rooms = models.PositiveSmallIntegerField(default=1)
    kitchens = models.PositiveSmallIntegerField(default=1)
    guest_toilets = models.PositiveSmallIntegerField(default=0)
    parking_spaces = models.PositiveSmallIntegerField(default=0)
    has_boys_quarters = models.BooleanField(default=False, verbose_name="Boys' quarters")
    plot_size_sqm = models.PositiveIntegerField(null=True, blank=True, verbose_name='Plot size (sqm)')
    floor_area_sqm = models.PositiveIntegerField(null=True, blank=True, verbose_name='Floor area (sqm)')
    year_built = models.PositiveSmallIntegerField(null=True, blank=True)
    furnishing = models.CharField(max_length=20, choices=FURNISHING, default='unfurnished')
    amenities = models.TextField(
        blank=True,
        help_text='Separate with commas, e.g. Swimming pool, Gym, CCTV, 24-hour security, Generator, Borehole',
    )
    title_document = models.CharField(max_length=30, choices=TITLE_DOCUMENTS, blank=True)
    service_charge = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='Yearly estate service charge in naira, if any',
    )
    agency_fee = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        verbose_name='Agency fee (rentals)',
        help_text='Rentals only: the agency fee in naira. Leave empty if there is none.',
    )

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def clean(self):
        super().clean()
        # the area must be one of the open areas of the chosen state
        if self.state and self.area and self.area not in AREAS.get(self.state, []):
            raise ValidationError({'area': f'{self.area} is not an open area in {self.state}.'})

    def __str__(self):
        return self.title


class HouseImage(models.Model):
    house = models.ForeignKey(House, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='house_images/')
    caption = models.CharField(max_length=100, blank=True)
    is_cover = models.BooleanField(default=False)

    def __str__(self):
        return f'Photo for {self.house.title}'


class Unlock(models.Model):
    """A house hunter paying to see one house's full details."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='unlocks')
    house = models.ForeignKey(House, on_delete=models.CASCADE, related_name='unlocks')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'house')

    def __str__(self):
        return f'{self.user} unlocked {self.house}'




class Payment(models.Model):
    """One attempt to pay to unlock a house. In test mode, no real money moves."""
    STATUS_CHOICES = [
        ('pending', 'Waiting for the card'),
        ('success', 'Paid'),
        ('failed', 'Failed'),
    ]

    reference = models.CharField(max_length=40, unique=True)
    # PROTECT: a payment is a financial record, so what it points at can't be deleted by accident
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='payments')
    house = models.ForeignKey(House, on_delete=models.PROTECT, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    provider = models.CharField(max_length=20, default='test')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    card_last4 = models.CharField(max_length=4, blank=True)
    failure_reason = models.CharField(max_length=120, blank=True)
    unlock = models.OneToOneField(
        Unlock, null=True, blank=True, on_delete=models.SET_NULL, related_name='payment'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.reference} ({self.get_status_display()})'
    


import os  # noqa: E402
import uuid  # noqa: E402

from django.core.files.storage import FileSystemStorage  # noqa: E402
from django.db.models.signals import post_delete  # noqa: E402
from django.dispatch import receiver  # noqa: E402

from .identity import ID_TYPES, PROVIDER_RESULTS  # noqa: E402


def get_private_storage():
    """ID photos and selfies live OUTSIDE the public media folder, so no web address can reach them.
    Only the protected admin view can open them."""
    return FileSystemStorage(location=settings.BASE_DIR / 'private_media')


def identity_upload_path(instance, filename):
    """A random name inside a per-agent folder, so a file name can never be guessed."""
    extension = os.path.splitext(filename)[1].lower()
    if extension not in ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.bmp'):
        extension = '.jpg'
    return f'identity/{instance.agent_id}/{uuid.uuid4().hex}{extension}'


class IdentityVerification(models.Model):
    """An agent's identity check: NIN, a government ID and a selfie."""
    STATUS_CHOICES = [
        ('submitted', 'Submitted, waiting for review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    agent = models.OneToOneField(Agent, on_delete=models.CASCADE, related_name='identity')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='submitted')
    rejection_reason = models.TextField(
        blank=True, help_text='Shown to the agent. Required when you reject.'
    )

    # We never keep the full NIN. Only a one-way fingerprint (so one NIN can't be used on two
    # accounts) and its last four digits (so you can compare it with the ID).
    nin_fingerprint = models.CharField(max_length=64, unique=True, editable=False)
    nin_last4 = models.CharField(max_length=4)

    id_type = models.CharField(max_length=20, choices=ID_TYPES)
    id_number_last4 = models.CharField(max_length=4)
    id_front = models.FileField(upload_to=identity_upload_path, storage=get_private_storage)
    id_back = models.FileField(upload_to=identity_upload_path, storage=get_private_storage, blank=True)
    selfie = models.FileField(upload_to=identity_upload_path, storage=get_private_storage)

    # The automated check. In test mode it is a pretend one.
    provider = models.CharField(max_length=20, default='test')
    provider_result = models.CharField(max_length=20, choices=PROVIDER_RESULTS)
    face_match_score = models.PositiveSmallIntegerField(default=0)

    consent_given_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=1)
    submitted_at = models.DateTimeField()
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-submitted_at']

    def clean(self):
        super().clean()
        if self.status == 'rejected' and not self.rejection_reason.strip():
            raise ValidationError({'rejection_reason': 'Please say why, so the agent knows what to fix.'})
        if self.status == 'approved' and self.provider_result != 'passed':
            raise ValidationError({'status': "The automated check did not pass, so this can't be approved."})

    def __str__(self):
        return f'{self.agent} ({self.get_status_display()})'


@receiver(post_delete, sender=IdentityVerification)
def delete_identity_files(sender, instance, **kwargs):
    """When a record is deleted, its pictures go too, so no sensitive file is left behind."""
    for stored in (instance.selfie, instance.id_front, instance.id_back):
        if stored:
            stored.delete(save=False)