# OneRoof9ja

A house-listing platform for Nigeria: agents list houses (free preview shown
to everyone; full details, photos and contact locked until a seeker pays a
small unlock fee), admin verifies agents and approves listings, and agents
pay a subscription/listing fee to the platform.

Stack: Django + Django REST Framework (backend), React + Vite (frontend).

## 1. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py seed_states     # loads Nigeria's 36 states + FCT, with starter LGAs
python manage.py createsuperuser # this is your admin login

python manage.py runserver
```

The API runs at `http://localhost:8000/api/`. The admin panel — where you
verify agents and approve/reject house listings — is at
`http://localhost:8000/admin/`.

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The site runs at `http://localhost:5173`.

## 3. How the pieces fit together

- **`core/models.py`** — State, LocalGovernment, AgentProfile, SeekerProfile,
  House, HouseImage, Unlock, AgentSubscription.
- **The paywall** lives in `core/views.py` → `HouseDetailView`. It always
  returns the free preview (state, LGA, price, bedrooms, one cover photo)
  unless the requester is the owning agent, staff, or a seeker who has an
  `Unlock` row for that house — only then does it return the full
  `HouseDetailSerializer` (gallery, exact street, description, agent contact).
- **Admin approval**: a house only becomes public when both
  `agent.is_verified` and `house.status == 'approved'` are true. Do this from
  `/admin/` — select agents or houses and use the "Verify" / "Approve" bulk
  actions.
- **Payments are stubbed.** `UnlockHouseView` and `SubscribeAgentView` grant
  access immediately instead of checking a real transaction, so you can test
  the whole flow end to end right away. Before launch, replace their bodies
  with a real Paystack or Flutterwave integration:
  1. Create a transaction and return its checkout URL to the frontend.
  2. On the provider's webhook, verify the transaction server-side.
  3. Only then create the `Unlock` / `AgentSubscription` row.

## 4. Nigeria location data

`seed_states` loads all 36 states + the FCT, with a starter set of local
governments for each (a handful, not the full official list). Add the rest
of each state's LGAs the same way — either extend
`core/management/commands/seed_states.py`, or add them from `/admin/`.

## 5. Suggested next steps

- Wire up real Paystack/Flutterwave payments (see above).
- Add password reset / email verification for agents and seekers.
- Add search and more filters (price range, bedrooms) to the browse page.
- Move `SECRET_KEY`, `DEBUG`, and the payment secret keys into environment
  variables, and switch the database to PostgreSQL, before deploying.
- Deploy the backend (Render, Railway, or a VPS with Gunicorn + Nginx) and
  the frontend (Vercel, Netlify, or the same Nginx server).
