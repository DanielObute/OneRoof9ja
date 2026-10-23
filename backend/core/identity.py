"""Identity checks for agents ("test mode").

Nothing here talks to NIMC or to a face-matching company. A NIN is checked against three
demo prefixes, and the "face match" result simply follows the demo number that was used.
When a real provider (Smile ID, Dojah, Youverify, Prembly...) is added later,
`run_test_check` is the function that gets replaced. Everything else stays.
"""
import hashlib
import hmac
import re

from PIL import Image

ID_TYPES = [
    ('passport', 'International passport'),
    ('drivers_licence', "Driver's licence"),
    ('voters_card', "Permanent voter's card"),
]

PROVIDER_RESULTS = [
    ('passed', 'Passed'),
    ('face_mismatch', 'Face did not match'),
    ('nin_not_found', 'NIN not found'),
]

# A NIN that starts with one of these is a demo number: prefix -> (result, face match score).
# Each agent needs a different number, so change the last digits: 11111111111, 11111111112...
DEMO_PREFIXES = {
    '111111': ('passed', 96),
    '222222': ('face_mismatch', 38),
    '333333': ('nin_not_found', 0),
}

# What an agent is told when the automated check fails.
REJECTION_REASONS = {
    'face_mismatch': (
        'The selfie did not match the photo on your ID. '
        'Please take a clearer selfie in good light and try again.'
    ),
    'nin_not_found': 'We could not find this NIN. Please check the number and try again.',
}

MAX_ATTEMPTS = 5

# The live check on the website takes three camera pictures and joins them side by side into ONE wide
# image, so a live selfie is always much wider than it is tall.
STRIP_MIN_RATIO = 2.5


class IdentityError(Exception):
    """Something about the details is wrong. The message is safe to show to the agent."""


def clean_nin(raw):
    nin = re.sub(r'[\s-]', '', str(raw or ''))
    if not re.fullmatch(r'[0-9]{11}', nin):
        raise IdentityError('A NIN has exactly 11 digits.')
    return nin


def clean_id_number(raw):
    value = re.sub(r'\s', '', str(raw or '')).upper()
    if not re.fullmatch(r'[A-Z0-9]{5,20}', value):
        raise IdentityError('Enter the number printed on your ID (5 to 20 letters and numbers).')
    return value


def clean_id_type(raw):
    if raw not in {key for key, _ in ID_TYPES}:
        raise IdentityError('Choose the type of ID you are uploading.')
    return raw


def nin_fingerprint(nin, secret):
    """A one-way code for a NIN. We keep this instead of the NIN itself, so the same NIN can't be
    used on two agent accounts, but a leaked database does not leak anyone's NIN.
    It is keyed with the secret key, so it can't be guessed by trying every possible NIN."""
    return hmac.new(secret.encode(), nin.encode(), hashlib.sha256).hexdigest()


def run_test_check(nin):
    """Returns (result, face_match_score). Raises IdentityError if it is not a demo number."""
    for prefix, outcome in DEMO_PREFIXES.items():
        if nin.startswith(prefix):
            return outcome
    raise IdentityError(
        'This site is in test mode, so only the demo NINs work. Please use one of the numbers shown.'
    )


def looks_like_live_strip(upload):
    """True if the picture has the shape of the website's live check (three pictures side by side).
    This turns away an ordinary photo that someone uploads. It is a format check, NOT proof that a
    camera was used: only a real verification provider can prove that."""
    try:
        width, height = Image.open(upload).size
    except Exception:
        return False
    finally:
        if hasattr(upload, 'seek'):
            upload.seek(0)
    return height > 0 and width / height >= STRIP_MIN_RATIO