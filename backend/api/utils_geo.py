"""Geocoding utilities.

Provides a small wrapper to reverse-geocode coordinates into structured
address pieces. Uses geopy.Nominatim when available; fails gracefully if
not installed or if the external service is unreachable.

Returns a tuple: (city, country, street_address, postal_code)
"""
from typing import Tuple, Optional


def reverse_geocode(lat: float, lon: float) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    try:
        from geopy.geocoders import Nominatim
        geolocator = Nominatim(user_agent='timecircle_app/1.0')
        # Request address details for richer decomposition
        location = geolocator.reverse((lat, lon), language='en', addressdetails=True)
        if not location:
            return None, None, None, None
        data = location.raw.get('address', {})
        city = data.get('city') or data.get('town') or data.get('village') or data.get('hamlet') or data.get('county')
        country = data.get('country')

        # Build a human-friendly street address when possible
        road = data.get('road') or data.get('pedestrian') or data.get('residential') or data.get('street') or ''
        house_number = data.get('house_number') or ''
        street_address = None
        if road:
            street_address = f"{road} {house_number}".strip()
            if street_address == '':
                street_address = None

        postal_code = data.get('postcode')
        return city, country, street_address, postal_code
    except Exception:
        return None, None, None, None
