from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token

from . import identity_views, views

urlpatterns = [
    path('auth/signup/', views.SignupView.as_view()),
    path('auth/agent-signup/', views.AgentSignupView.as_view()),
    path('auth/login/', obtain_auth_token),
    path('locations/', views.LocationsView.as_view()),
    path('options/', views.FormOptionsView.as_view()),
    path('houses/', views.HouseListView.as_view()),
    path('houses/<int:pk>/', views.HouseDetailView.as_view()),
    path('houses/<int:pk>/pay/', views.StartPaymentView.as_view()),
    path('payments/<str:reference>/charge/', views.ChargeTestCardView.as_view()),
    path('agents/<int:pk>/', views.AgentDetailView.as_view()),
    path('agents/<int:agent_id>/houses/', views.AgentHouseListView.as_view()),

    # the agent dashboard (agents only)
    path('dashboard/me/', views.AgentMeView.as_view()),
    path('dashboard/identity/', identity_views.IdentityView.as_view()),
    path('dashboard/houses/', views.AgentHousesView.as_view()),
    path('dashboard/houses/<int:pk>/', views.AgentHouseDetailView.as_view()),
    path('dashboard/houses/<int:pk>/images/', views.AgentHouseImagesView.as_view()),
    path('dashboard/houses/<int:pk>/images/<int:image_id>/', views.AgentHouseImageDetailView.as_view()),

    # identity pictures, for admin staff only (they are not in the public media folder)
    path('admin-files/identity/<int:pk>/<str:kind>/', identity_views.identity_file, name='identity-file'),
]