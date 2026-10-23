from datetime import date

from django.contrib.auth import get_user_model, password_validation
from django.db import transaction
from rest_framework import serializers
from .models import AREAS, STATES, Agent, House, HouseImage

User = get_user_model()


class AgentPublicSerializer(serializers.ModelSerializer):
    # No phone number here on purpose: it stays hidden until a house is unlocked.
    class Meta:
        model = Agent
        fields = ['id', 'business_name', 'state', 'areas', 'bio', 'is_verified']


class HouseImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = HouseImage
        fields = ['id', 'image', 'caption', 'is_cover']


class HousePreviewSerializer(serializers.ModelSerializer):
    # coerce_to_string=False sends the price as a number, so React can format it
    price = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    price_suffix = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    agent_id = serializers.IntegerField(source='agent.id', read_only=True)
    agent_name = serializers.CharField(source='agent.business_name', read_only=True)
    is_locked = serializers.SerializerMethodField()

    class Meta:
        model = House
        # Street, description, gallery, phone and the other details are NOT in this list on purpose.
        fields = [
            'id', 'title', 'listing_type', 'state', 'area', 'price', 'price_suffix',
            'bedrooms', 'bathrooms', 'units_available', 'cover_image',
            'agent_id', 'agent_name', 'is_locked',
        ]

    def get_price_suffix(self, obj):
        # "per year" or "per month" for rentals, nothing for sales
        if obj.listing_type == 'rent':
            return f'per {obj.rent_period}'
        return ''

    def get_cover_image(self, obj):
        image = obj.images.filter(is_cover=True).first() or obj.images.first()
        if not image:
            return None
        request = self.context.get('request')
        url = image.image.url
        return request.build_absolute_uri(url) if request else url

    def get_is_locked(self, obj):
        return True


class HouseFullSerializer(HousePreviewSerializer):
    """Everything in the preview, plus the locked details.
    The views only use this for someone who unlocked the house (or owns it)."""
    images = HouseImageSerializer(many=True, read_only=True)
    agent_phone = serializers.CharField(source='agent.phone', read_only=True)
    property_type_label = serializers.CharField(source='get_property_type_display', read_only=True)
    furnishing_label = serializers.CharField(source='get_furnishing_display', read_only=True)
    title_document_label = serializers.CharField(source='get_title_document_display', read_only=True)
    amenities = serializers.SerializerMethodField()
    service_charge = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True, allow_null=True
    )
    agency_fee = serializers.SerializerMethodField()

    class Meta(HousePreviewSerializer.Meta):
        fields = HousePreviewSerializer.Meta.fields + [
            'street', 'description', 'images', 'agent_phone',
            'property_type_label', 'living_rooms', 'kitchens', 'guest_toilets',
            'parking_spaces', 'has_boys_quarters', 'plot_size_sqm', 'floor_area_sqm',
            'year_built', 'furnishing_label', 'amenities', 'title_document_label',
            'service_charge', 'agency_fee',
        ]

    def get_amenities(self, obj):
        return [item.strip() for item in obj.amenities.split(',') if item.strip()]

    def get_agency_fee(self, obj):
        # the agency fee only applies to rentals, so a house for sale never sends one
        if obj.listing_type == 'rent' and obj.agency_fee is not None:
            return float(obj.agency_fee)
        return None

    def get_is_locked(self, obj):
        return False


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        # the email is used as the login name
        return User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
        )


class AgentSignupSerializer(serializers.Serializer):
    """Creates the login account and the agent profile together.
    The agent starts UNVERIFIED, so nothing they do is public until you verify them in the admin."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    business_name = serializers.CharField(max_length=150)
    cac_number = serializers.CharField(max_length=50)
    phone = serializers.CharField(max_length=20)
    state = serializers.ChoiceField(choices=STATES)
    areas = serializers.ListField(child=serializers.CharField(), allow_empty=False)
    bio = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def validate_phone(self, value):
        digits = ''.join(ch for ch in value if ch.isdigit())
        if len(digits) < 10 or len(digits) > 15:
            raise serializers.ValidationError('Enter a valid phone number.')
        return value.strip()

    def validate(self, attrs):
        # every area must be an open area of the chosen state
        allowed = AREAS.get(attrs['state'], [])
        not_open = [area for area in attrs['areas'] if area not in allowed]
        if not_open:
            raise serializers.ValidationError(
                {'areas': f"{', '.join(not_open)} is not an open area in {attrs['state']}."}
            )
        return attrs

    def create(self, validated_data):
        areas = list(dict.fromkeys(validated_data['areas']))  # no repeats, same order
        # both rows are created together, or neither is
        with transaction.atomic():
            user = User.objects.create_user(
                username=validated_data['email'],
                email=validated_data['email'],
                password=validated_data['password'],
            )
            return Agent.objects.create(
                user=user,
                business_name=validated_data['business_name'],
                cac_number=validated_data['cac_number'],
                phone=validated_data['phone'],
                state=validated_data['state'],
                areas=', '.join(areas),
                bio=validated_data.get('bio', ''),
            )


# ---------- The agent dashboard ----------

class AgentMeSerializer(serializers.ModelSerializer):
    """An agent's own profile. They can see their own phone number."""
    class Meta:
        model = Agent
        fields = ['id', 'business_name', 'state', 'areas', 'phone', 'bio', 'is_verified']


class AgentHouseSerializer(serializers.ModelSerializer):
    """What an agent sees about their own listings, including photos and review status."""
    price = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    price_suffix = serializers.SerializerMethodField()
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    cover_image = serializers.SerializerMethodField()
    images = HouseImageSerializer(many=True, read_only=True)
    unlock_count = serializers.SerializerMethodField()

    class Meta:
        model = House
        fields = [
            'id', 'title', 'listing_type', 'state', 'area', 'price', 'price_suffix',
            'bedrooms', 'bathrooms', 'units_available', 'status', 'status_label',
            'cover_image', 'images', 'unlock_count', 'created_at',
        ]

    def get_price_suffix(self, obj):
        if obj.listing_type == 'rent':
            return f'per {obj.rent_period}'
        return ''

    def get_cover_image(self, obj):
        image = obj.images.filter(is_cover=True).first() or obj.images.first()
        if not image:
            return None
        request = self.context.get('request')
        url = image.image.url
        return request.build_absolute_uri(url) if request else url

    def get_unlock_count(self, obj):
        return obj.unlocks.count()


class HouseWriteSerializer(serializers.ModelSerializer):
    """What an agent is allowed to send when adding a house.
    The status is NOT here, so an agent can never approve their own listing."""

    class Meta:
        model = House
        fields = [
            'title', 'listing_type', 'rent_period', 'state', 'area', 'price',
            'bedrooms', 'bathrooms', 'units_available',
            'street', 'description', 'property_type', 'living_rooms', 'kitchens',
            'guest_toilets', 'parking_spaces', 'has_boys_quarters',
            'plot_size_sqm', 'floor_area_sqm', 'year_built', 'furnishing',
            'amenities', 'title_document', 'service_charge', 'agency_fee',
        ]

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('Enter a price greater than zero.')
        return value

    def validate_units_available(self, value):
        if value < 1:
            raise serializers.ValidationError('At least one unit must be available.')
        return value

    def validate_year_built(self, value):
        if value is not None and not (1900 <= value <= date.today().year + 2):
            raise serializers.ValidationError('Enter a valid year.')
        return value

    def validate_description(self, value):
        if len(value.strip()) < 30:
            raise serializers.ValidationError('Please describe the house in at least 30 characters.')
        return value

    def validate_amenities(self, value):
        items = [item.strip() for item in value.split(',') if item.strip()]
        if len(items) > 25 or any(len(item) > 40 for item in items):
            raise serializers.ValidationError('Keep amenities short, with at most 25 items.')
        return ', '.join(items)

    def validate(self, attrs):
        # the area must be one of the open areas of the chosen state
        if attrs['area'] not in AREAS.get(attrs['state'], []):
            raise serializers.ValidationError(
                {'area': f"{attrs['area']} is not an open area in {attrs['state']}."}
            )
        # an agency fee only makes sense for a rental
        if attrs.get('listing_type') == 'sale':
            attrs['agency_fee'] = None
        return attrs


class ImageUploadSerializer(serializers.Serializer):
    """Used only to check that an uploaded file really is a picture."""
    image = serializers.ImageField()