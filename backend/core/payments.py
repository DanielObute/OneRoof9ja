"""The pretend payment system ("test mode").

Nothing here talks to a bank. A card is "charged" by checking it against a short list
of demo cards. When Paystack is added later, this file is the part that gets replaced:
the views keep the same two steps (start a payment, then charge it).
"""
import re
import uuid
from datetime import date

# The only cards that work in test mode.
# card number -> (does the charge go through?, message shown if it does not)
TEST_CARDS = {
    '4242424242424242': (True, ''),
    '4000000000000002': (False, 'Your card was declined.'),
    '4000000000009995': (False, 'Your card has insufficient funds.'),
}


class CardError(Exception):
    """The card details are not valid (for example a typo). This is not the same as a declined card."""


def new_reference():
    """A receipt number, like ORJ-3F9A1C2B7D4E."""
    return 'ORJ-' + uuid.uuid4().hex[:12].upper()


def clean_card_number(raw):
    digits = re.sub(r'[\s-]', '', str(raw or ''))
    if not re.fullmatch(r'[0-9]{13,19}', digits):
        raise CardError('Enter a valid card number.')
    return digits


def check_expiry(raw, today=None):
    today = today or date.today()
    match = re.fullmatch(r'\s*(\d{1,2})\s*/\s*(\d{2}|\d{4})\s*', str(raw or ''))
    if not match:
        raise CardError('Enter the expiry date as MM/YY.')
    month, year = int(match.group(1)), int(match.group(2))
    if year < 100:
        year += 2000
    if not 1 <= month <= 12:
        raise CardError('Enter a valid expiry month.')
    # a card works until the end of its expiry month
    if (year, month) < (today.year, today.month):
        raise CardError('This card has expired.')


def check_cvv(raw):
    if not re.fullmatch(r'[0-9]{3,4}', str(raw or '').strip()):
        raise CardError('Enter the 3 or 4 digit security code.')


def check_test_card(number, expiry, cvv):
    """Returns (goes_through, message, last4).
    Raises CardError if the details are not valid, or are not one of the demo cards."""
    digits = clean_card_number(number)
    check_expiry(expiry)
    check_cvv(cvv)

    outcome = TEST_CARDS.get(digits)
    if outcome is None:
        raise CardError(
            'This site is in test mode, so only the demo cards work. Please use one of the cards shown.'
        )
    goes_through, message = outcome
    return goes_through, message, digits[-4:]