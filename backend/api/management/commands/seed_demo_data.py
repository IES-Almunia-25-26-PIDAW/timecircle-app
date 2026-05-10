"""
Comando de gestión para poblar la base de datos con datos de demostración.

Los usuarios demo ya tienen créditos acumulados a través de su actividad,
tal como ocurriría en la plataforma real (empezando desde 0 + bonos + trades).

Uso:
    python manage.py seed_demo_data
    python manage.py seed_demo_data --reset
"""

import decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from api.models import (
    User, Category, Tag, Skill, UserSkill,
    Service, Trade, Transaction,
    Conversation, Message, Review,
)


class Command(BaseCommand):
    help = 'Pobla la base de datos con datos de demostración para TimeCircle.'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true',
                            help='Elimina todos los datos existentes antes de crear los de demo.')

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write(self.style.WARNING('Eliminando datos existentes...'))
            Review.objects.all().delete()
            Message.objects.all().delete()
            Conversation.objects.all().delete()
            Transaction.objects.all().delete()
            Trade.objects.all().delete()
            Service.objects.all().delete()
            UserSkill.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            self.stdout.write(self.style.SUCCESS('Datos eliminados.\n'))

        self._create_admin()
        users      = self._create_users()
        skills     = self._create_skills(users)
        categories = list(Category.objects.all())
        tags       = self._create_tags()
        services   = self._create_services(users, categories, tags)
        trades     = self._create_trades(users, services)
        self._create_conversations(users, trades)
        self._create_reviews(users, trades)

        self.stdout.write(self.style.SUCCESS('\n✔ Datos de demo creados correctamente.'))
        self.stdout.write('  Admin: admin / Admin1234!')

    # ── Helpers ────────────────────────────────────────────

    def _create_admin(self):
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@timecircle.com',
                password='Admin1234!',
                first_name='Admin',
                last_name='TimeCircle',
                bio='Administrador de la plataforma TimeCircle.',
                location='Madrid',
                # El admin no necesita créditos de intercambio
                credits=decimal.Decimal('0.0'),
            )
            self.stdout.write(self.style.SUCCESS('  ✔ Admin creado'))

    def _create_users(self):
        """
        Créditos de los usuarios demo reflejan el saldo tras su actividad:
          - Bono primera skill:    +0,5 cr
          - Bono primer servicio:  +0,5 cr
          - Bono primer trade:     +1,0 cr (solo offerers)
          - Créditos de trades completados (positivos/negativos según rol)
        Los valores aquí son simplificaciones realistas de ese estado.
        """
        demo_users = [
            {
                'username': 'maria_garcia', 'email': 'maria@demo.com', 'password': 'Demo1234!',
                'first_name': 'María', 'last_name': 'García',
                'bio': 'Profesora jubilada apasionada por la jardinería y la cocina tradicional.',
                'location': 'Madrid',
                # Empezó en 0; ganó bonos (+1 cr) y pagó varios servicios
                'credits': decimal.Decimal('8.0'), 'share_exact_location': True,
                'completed_trades': 12, 'hours_given': 8, 'hours_received': 5,
            },
            {
                'username': 'carlos_lopez', 'email': 'carlos@demo.com', 'password': 'Demo1234!',
                'first_name': 'Carlos', 'last_name': 'López',
                'bio': 'Ingeniero informático. Me encanta ayudar con tecnología y dar clases de programación.',
                'location': 'Barcelona',
                'credits': decimal.Decimal('5.5'),
                'completed_trades': 7, 'hours_given': 5, 'hours_received': 3,
            },
            {
                'username': 'ana_martinez', 'email': 'ana@demo.com', 'password': 'Demo1234!',
                'first_name': 'Ana', 'last_name': 'Martínez',
                'bio': 'Fisioterapeuta y profesora de yoga. Vivo en el barrio de Gracia.',
                'location': 'Barcelona',
                'credits': decimal.Decimal('15.0'),
                'completed_trades': 21, 'hours_given': 14, 'hours_received': 8,
            },
            {
                'username': 'pedro_sanchez', 'email': 'pedro@demo.com', 'password': 'Demo1234!',
                'first_name': 'Pedro', 'last_name': 'Sánchez',
                'bio': 'Electricista autónomo. Puedo ayudar con instalaciones y reparaciones del hogar.',
                'location': 'Valencia',
                # Usuario nuevo: solo tiene los bonos de onboarding + 1 trade
                'credits': decimal.Decimal('4.0'),
                'completed_trades': 3, 'hours_given': 2, 'hours_received': 1,
            },
            {
                'username': 'lucia_fernandez', 'email': 'lucia@demo.com', 'password': 'Demo1234!',
                'first_name': 'Lucía', 'last_name': 'Fernández',
                'bio': 'Diseñadora gráfica y fotógrafa. Hablo inglés, francés y español.',
                'location': 'Sevilla',
                'credits': decimal.Decimal('28.5'),
                'completed_trades': 35, 'hours_given': 22, 'hours_received': 12,
            },
            {
                'username': 'marta_jerez', 'email': 'marta.jerez@demo.com', 'password': 'Demo1234!',
                'first_name': 'Marta', 'last_name': 'Rubio',
                'bio': 'Profesora de guitarra, especializada en flamenco.',
                'location': 'Jerez de la Frontera',
                'street_address': 'Calle Larga 12', 'postal_code': '11401', 'share_exact_location': True,
                'credits': decimal.Decimal('10.0'),
                'completed_trades': 10, 'hours_given': 12, 'hours_received': 4,
            },
            {
                'username': 'jose_jerez', 'email': 'jose.jerez@demo.com', 'password': 'Demo1234!',
                'first_name': 'José', 'last_name': 'López',
                'bio': 'Carpintero y aficionado a la restauración de muebles.',
                'location': 'Jerez de la Frontera',
                'street_address': 'Calle Ancha 5', 'postal_code': '11402', 'share_exact_location': True,
                'credits': decimal.Decimal('6.0'),
                'completed_trades': 5, 'hours_given': 6, 'hours_received': 2,
            },
            {
                'username': 'juan_jerez', 'email': 'juan.jerez@demo.com', 'password': 'Demo1234!',
                'first_name': 'Juan', 'last_name': 'García',
                'bio': 'Necesito ayuda con mudanza y transporte local.',
                'location': 'Jerez de la Frontera',
                'street_address': 'Avenida de la Constitución 23', 'postal_code': '11403', 'share_exact_location': True,
                'credits': decimal.Decimal('2.0'),
                'completed_trades': 1, 'hours_given': 0, 'hours_received': 1,
            },
            {
                'username': 'elena_madrid', 'email': 'elena.madrid@demo.com', 'password': 'Demo1234!',
                'first_name': 'Elena', 'last_name': 'Ruiz',
                'bio': 'Traductora y vecina de Chamberí. Ayudo con idiomas y trámites cotidianos.',
                'location': 'Madrid',
                'street_address': 'Calle de Fuencarral 98', 'postal_code': '28004',
                'latitude': '40.427500', 'longitude': '-3.703100', 'share_exact_location': True,
                'credits': decimal.Decimal('11.5'),
                'completed_trades': 9, 'hours_given': 7, 'hours_received': 3,
            },
            {
                'username': 'diego_madrid', 'email': 'diego.madrid@demo.com', 'password': 'Demo1234!',
                'first_name': 'Diego', 'last_name': 'Moreno',
                'bio': 'Entrenador personal en Retiro. Me gusta organizar rutas urbanas y sesiones al aire libre.',
                'location': 'Madrid',
                'street_address': 'Avenida de Menéndez Pelayo 45', 'postal_code': '28009',
                'latitude': '40.415300', 'longitude': '-3.677800', 'share_exact_location': True,
                'credits': decimal.Decimal('18.0'),
                'completed_trades': 24, 'hours_given': 18, 'hours_received': 6,
            },
            {
                'username': 'sofia_madrid', 'email': 'sofia.madrid@demo.com', 'password': 'Demo1234!',
                'first_name': 'Sofía', 'last_name': 'Navarro',
                'bio': 'Arquitecta técnica. Puedo orientar en reformas pequeñas y eficiencia energética.',
                'location': 'Madrid',
                'street_address': 'Paseo de la Castellana 142', 'postal_code': '28046',
                'latitude': '40.459300', 'longitude': '-3.689600', 'share_exact_location': True,
                'credits': decimal.Decimal('7.0'),
                'completed_trades': 6, 'hours_given': 5, 'hours_received': 2,
            },
            {
                'username': 'raul_madrid', 'email': 'raul.madrid@demo.com', 'password': 'Demo1234!',
                'first_name': 'Raúl', 'last_name': 'Ortega',
                'bio': 'Técnico de sonido y músico aficionado. Ayudo con grabaciones caseras y eventos.',
                'location': 'Madrid',
                'street_address': 'Calle de Toledo 63', 'postal_code': '28005',
                'latitude': '40.409900', 'longitude': '-3.708900', 'share_exact_location': True,
                'credits': decimal.Decimal('4.5'),
                'completed_trades': 4, 'hours_given': 3, 'hours_received': 2,
            },
            {
                'username': 'nuria_barcelona', 'email': 'nuria.barcelona@demo.com', 'password': 'Demo1234!',
                'first_name': 'Núria', 'last_name': 'Vidal',
                'bio': 'Ilustradora en Poblenou. Comparto técnicas de dibujo digital y acuarela.',
                'location': 'Barcelona',
                'street_address': 'Carrer de Pujades 156', 'postal_code': '08005',
                'latitude': '41.399300', 'longitude': '2.196600', 'share_exact_location': True,
                'credits': decimal.Decimal('13.0'),
                'completed_trades': 14, 'hours_given': 11, 'hours_received': 4,
            },
            {
                'username': 'pau_barcelona', 'email': 'pau.barcelona@demo.com', 'password': 'Demo1234!',
                'first_name': 'Pau', 'last_name': 'Serra',
                'bio': 'Cocinero de barrio en Sants. Enseño recetas de aprovechamiento y cocina saludable.',
                'location': 'Barcelona',
                'street_address': 'Carrer de Sants 87', 'postal_code': '08014',
                'latitude': '41.375100', 'longitude': '2.137900', 'share_exact_location': True,
                'credits': decimal.Decimal('9.5'),
                'completed_trades': 8, 'hours_given': 6, 'hours_received': 5,
            },
            {
                'username': 'laia_barcelona', 'email': 'laia.barcelona@demo.com', 'password': 'Demo1234!',
                'first_name': 'Laia', 'last_name': 'Ferrer',
                'bio': 'Enfermera y formadora en primeros auxilios básicos para familias y asociaciones.',
                'location': 'Barcelona',
                'street_address': 'Travessera de Gràcia 214', 'postal_code': '08024',
                'latitude': '41.406900', 'longitude': '2.160400', 'share_exact_location': True,
                'credits': decimal.Decimal('21.0'),
                'completed_trades': 27, 'hours_given': 20, 'hours_received': 7,
            },
            {
                'username': 'marc_barcelona', 'email': 'marc.barcelona@demo.com', 'password': 'Demo1234!',
                'first_name': 'Marc', 'last_name': 'Pujol',
                'bio': 'Desarrollador frontend. Puedo ayudar con webs personales y accesibilidad.',
                'location': 'Barcelona',
                'street_address': 'Carrer de Balmes 320', 'postal_code': '08006',
                'latitude': '41.401800', 'longitude': '2.145200', 'share_exact_location': True,
                'credits': decimal.Decimal('6.5'),
                'completed_trades': 5, 'hours_given': 4, 'hours_received': 3,
            },
            {
                'username': 'clara_valencia', 'email': 'clara.valencia@demo.com', 'password': 'Demo1234!',
                'first_name': 'Clara', 'last_name': 'Soler',
                'bio': 'Bióloga y educadora ambiental. Organizo talleres sobre plantas mediterráneas.',
                'location': 'Valencia',
                'street_address': 'Carrer de Colón 42', 'postal_code': '46004',
                'latitude': '39.469400', 'longitude': '-0.369200', 'share_exact_location': True,
                'credits': decimal.Decimal('8.5'),
                'completed_trades': 7, 'hours_given': 6, 'hours_received': 2,
            },
            {
                'username': 'toni_valencia', 'email': 'toni.valencia@demo.com', 'password': 'Demo1234!',
                'first_name': 'Toni', 'last_name': 'Ibáñez',
                'bio': 'Mecánico de bicicletas en Benimaclet. Ayudo con mantenimiento y rutas urbanas.',
                'location': 'Valencia',
                'street_address': 'Carrer de la Guàrdia Civil 22', 'postal_code': '46020',
                'latitude': '39.484300', 'longitude': '-0.362400', 'share_exact_location': True,
                'credits': decimal.Decimal('12.0'),
                'completed_trades': 11, 'hours_given': 9, 'hours_received': 3,
            },
            {
                'username': 'ines_valencia', 'email': 'ines.valencia@demo.com', 'password': 'Demo1234!',
                'first_name': 'Inés', 'last_name': 'Crespo',
                'bio': 'Profesora de historia del arte. Me encanta preparar visitas culturales por la ciudad.',
                'location': 'Valencia',
                'street_address': 'Plaça de la Reina 8', 'postal_code': '46001',
                'latitude': '39.474100', 'longitude': '-0.375100', 'share_exact_location': True,
                'credits': decimal.Decimal('17.5'),
                'completed_trades': 22, 'hours_given': 16, 'hours_received': 8,
            },
            {
                'username': 'sergio_valencia', 'email': 'sergio.valencia@demo.com', 'password': 'Demo1234!',
                'first_name': 'Sergio', 'last_name': 'Pastor',
                'bio': 'Fotógrafo aficionado en Ruzafa. Comparto edición básica y fotografía nocturna.',
                'location': 'Valencia',
                'street_address': 'Carrer de Sueca 31', 'postal_code': '46006',
                'latitude': '39.462600', 'longitude': '-0.373900', 'share_exact_location': True,
                'credits': decimal.Decimal('5.0'),
                'completed_trades': 4, 'hours_given': 4, 'hours_received': 1,
            },
            {
                'username': 'rocio_sevilla', 'email': 'rocio.sevilla@demo.com', 'password': 'Demo1234!',
                'first_name': 'Rocío', 'last_name': 'Molina',
                'bio': 'Maestra de primaria. Ayudo con apoyo escolar y organización de estudio.',
                'location': 'Sevilla',
                'street_address': 'Calle San Jacinto 54', 'postal_code': '41010',
                'latitude': '37.383200', 'longitude': '-6.007900', 'share_exact_location': True,
                'credits': decimal.Decimal('10.5'),
                'completed_trades': 10, 'hours_given': 8, 'hours_received': 4,
            },
            {
                'username': 'alvaro_sevilla', 'email': 'alvaro.sevilla@demo.com', 'password': 'Demo1234!',
                'first_name': 'Álvaro', 'last_name': 'Reyes',
                'bio': 'Guía turístico y apasionado de la historia local. Preparo rutas por barrios sevillanos.',
                'location': 'Sevilla',
                'street_address': 'Calle Feria 118', 'postal_code': '41002',
                'latitude': '37.399000', 'longitude': '-5.991900', 'share_exact_location': True,
                'credits': decimal.Decimal('19.0'),
                'completed_trades': 25, 'hours_given': 19, 'hours_received': 5,
            },
            {
                'username': 'paula_sevilla', 'email': 'paula.sevilla@demo.com', 'password': 'Demo1234!',
                'first_name': 'Paula', 'last_name': 'Benítez',
                'bio': 'Costurera y diseñadora de arreglos. Enseño pequeños remiendos y patronaje básico.',
                'location': 'Sevilla',
                'street_address': 'Avenida de la Buhaira 16', 'postal_code': '41018',
                'latitude': '37.382700', 'longitude': '-5.979100', 'share_exact_location': True,
                'credits': decimal.Decimal('6.0'),
                'completed_trades': 5, 'hours_given': 5, 'hours_received': 2,
            },
            {
                'username': 'manuel_sevilla', 'email': 'manuel.sevilla@demo.com', 'password': 'Demo1234!',
                'first_name': 'Manuel', 'last_name': 'Campos',
                'bio': 'Jardinero con experiencia en patios y macetas. Puedo ayudar a diseñar rincones verdes.',
                'location': 'Sevilla',
                'street_address': 'Calle Luis Montoto 92', 'postal_code': '41018',
                'latitude': '37.386100', 'longitude': '-5.968700', 'share_exact_location': True,
                'credits': decimal.Decimal('14.0'),
                'completed_trades': 13, 'hours_given': 12, 'hours_received': 4,
            },
            {
                'username': 'belen_jerez', 'email': 'belen.jerez@demo.com', 'password': 'Demo1234!',
                'first_name': 'Belén', 'last_name': 'Ramos',
                'bio': 'Repostera casera. Comparto recetas de dulces tradicionales y organización de eventos.',
                'location': 'Jerez de la Frontera',
                'street_address': 'Calle Porvera 28', 'postal_code': '11403',
                'latitude': '36.688400', 'longitude': '-6.142300', 'share_exact_location': True,
                'credits': decimal.Decimal('9.0'),
                'completed_trades': 8, 'hours_given': 7, 'hours_received': 3,
            },
            {
                'username': 'ismael_jerez', 'email': 'ismael.jerez@demo.com', 'password': 'Demo1234!',
                'first_name': 'Ismael', 'last_name': 'Carmona',
                'bio': 'Informático de soporte. Ayudo con móviles, impresoras y seguridad básica.',
                'location': 'Jerez de la Frontera',
                'street_address': 'Avenida Álvaro Domecq 11', 'postal_code': '11405',
                'latitude': '36.695300', 'longitude': '-6.130700', 'share_exact_location': True,
                'credits': decimal.Decimal('15.5'),
                'completed_trades': 18, 'hours_given': 13, 'hours_received': 6,
            },
            {
                'username': 'carmen_jerez', 'email': 'carmen.jerez@demo.com', 'password': 'Demo1234!',
                'first_name': 'Carmen', 'last_name': 'Vega',
                'bio': 'Profesora de baile. Ofrezco iniciación a sevillanas y estiramientos para mayores.',
                'location': 'Jerez de la Frontera',
                'street_address': 'Calle Medina 44', 'postal_code': '11402',
                'latitude': '36.682700', 'longitude': '-6.134800', 'share_exact_location': True,
                'credits': decimal.Decimal('22.0'),
                'completed_trades': 30, 'hours_given': 23, 'hours_received': 9,
            },
            {
                'username': 'luis_jerez', 'email': 'luis.jerez@demo.com', 'password': 'Demo1234!',
                'first_name': 'Luis', 'last_name': 'Domínguez',
                'bio': 'Aficionado a la electrónica y pequeñas reparaciones. También enseño soldadura básica.',
                'location': 'Jerez de la Frontera',
                'street_address': 'Calle Corredera 19', 'postal_code': '11402',
                'latitude': '36.681300', 'longitude': '-6.139900', 'share_exact_location': True,
                'credits': decimal.Decimal('5.5'),
                'completed_trades': 5, 'hours_given': 4, 'hours_received': 2,
            },
        ]

        users = []
        # Mapping from demo human-readable location to example coordinates
        demo_coords = {
            'Madrid': ('40.416775', '-3.703790'),
            'Barcelona': ('41.385064', '2.173404'),
            'Valencia': ('39.469908', '-0.376288'),
            'Sevilla': ('37.389092', '-5.984459'),
            'Jerez de la Frontera': ('36.685000', '-6.126000'),
        }

        for data in demo_users:
            if not User.objects.filter(username=data['username']).exists():
                user = User.objects.create_user(**data)
                # If the demo user's human-readable location matches a known city,
                # populate precise (private) coordinates and structured city/country.
                loc = (data.get('location') or '').strip()
                coords = (
                    (data.get('latitude'), data.get('longitude'))
                    if data.get('latitude') and data.get('longitude')
                    else demo_coords.get(loc)
                )
                if coords:
                    user.latitude = decimal.Decimal(coords[0])
                    user.longitude = decimal.Decimal(coords[1])
                    user.city = loc
                    user.country = 'España'
                    update_fields = ['latitude', 'longitude', 'city', 'country']
                    # Optional exact-address demo values
                    if data.get('street_address'):
                        user.street_address = data.get('street_address')
                        update_fields.append('street_address')
                    if data.get('postal_code'):
                        user.postal_code = data.get('postal_code')
                        update_fields.append('postal_code')
                    if 'share_exact_location' in data:
                        user.share_exact_location = bool(data.get('share_exact_location'))
                        update_fields.append('share_exact_location')
                    user.save(update_fields=update_fields)

                user.update_badge()
                users.append(user)
                self.stdout.write(f'  ✔ Usuario: {user.username}')
            else:
                users.append(User.objects.get(username=data['username']))

        return users

    def _create_skills(self, users):
        skill_names = [
            'Programación Python', 'Diseño Web', 'Reparaciones eléctricas',
            'Jardinería', 'Cocina mediterránea', 'Yoga', 'Fotografía',
            'Inglés', 'Francés', 'Fisioterapia', 'Clases particulares',
        ]
        skills = []
        for name in skill_names:
            skill, _ = Skill.objects.get_or_create(name=name)
            skills.append(skill)

        assignments = [
            (users[0], ['Jardinería', 'Cocina mediterránea', 'Clases particulares']),
            (users[1], ['Programación Python', 'Diseño Web', 'Inglés']),
            (users[2], ['Yoga', 'Fisioterapia', 'Inglés']),
            (users[3], ['Reparaciones eléctricas']),
            (users[4], ['Diseño Web', 'Fotografía', 'Inglés', 'Francés']),
        ]
        for user, skill_names_list in assignments:
            for sname in skill_names_list:
                skill = next((s for s in skills if s.name == sname), None)
                if skill:
                    UserSkill.objects.get_or_create(user=user, skill=skill)

        return skills

    def _create_tags(self):
        tag_names = [
            'online', 'presencial', 'urgente', 'flexible', 'principiantes',
            'avanzado', 'fines-de-semana', 'entre-semana',
        ]
        tags = []
        for name in tag_names:
            tag, _ = Tag.objects.get_or_create(name=name)
            tags.append(tag)
        return tags

    def _create_services(self, users, categories, tags):
        cat = {c.name: c for c in categories}

        # Map users by username to allow referencing by name in services_data
        users_map = {u.username: u for u in users}

        services_data = [
            {
                'user': users[0], 'type': 'offer',
                'title': 'Clases de cocina mediterránea',
                'description': 'Enseño a cocinar platos tradicionales de la cocina española.',
                'category': cat.get('Cocina'), 'duration': 120, 'credits': 2,
                'tag_names': ['presencial', 'principiantes'],
            },
            {
                'user': users[0], 'type': 'request',
                'title': 'Necesito ayuda con el ordenador',
                'description': 'Tengo problemas con mi portátil. Necesito que alguien me ayude a configurarlo.',
                'category': cat.get('Tecnología'), 'duration': 60, 'credits': 1,
                'tag_names': ['presencial', 'urgente'],
            },
            {
                'user': users[1], 'type': 'offer',
                'title': 'Clases de programación Python',
                'description': 'Doy clases de Python desde cero.',
                'category': cat.get('Tecnología'), 'duration': 90, 'credits': 2,
                'tag_names': ['online', 'principiantes', 'avanzado'],
            },
            {
                'user': users[2], 'type': 'offer',
                'title': 'Sesión de yoga para principiantes',
                'description': 'Clases de yoga adaptadas a principiantes.',
                'category': cat.get('Deporte y Bienestar'), 'duration': 60, 'credits': 1,
                'tag_names': ['presencial', 'principiantes', 'fines-de-semana'],
            },
            {
                'user': users[3], 'type': 'offer',
                'title': 'Revisión eléctrica del hogar',
                'description': 'Soy electricista certificado. Reviso instalaciones.',
                'category': cat.get('Hogar'), 'duration': 60, 'credits': 2,
                'tag_names': ['presencial', 'urgente'],
            },
            {
                'user': users[4], 'type': 'offer',
                'title': 'Sesión fotográfica de retrato',
                'description': 'Reportaje fotográfico de 1 hora. Edición incluida.',
                'category': cat.get('Arte y Creatividad'), 'duration': 60, 'credits': 3,
                'tag_names': ['presencial'],
            },
            {
                'user': users[4], 'type': 'offer',
                'title': 'Traducción inglés-español',
                'description': 'Traduzco documentos del inglés al español y viceversa.',
                'category': cat.get('Idiomas'), 'duration': 30, 'credits': 1,
                'tag_names': ['online', 'flexible'],
            },
            {
                'user': users[1], 'type': 'request',
                'title': 'Busco clases de inglés conversacional',
                'description': 'Quiero mejorar mi inglés hablado. Nivel B1.',
                'category': cat.get('Idiomas'), 'duration': 60, 'credits': 1,
                'tag_names': ['online', 'entre-semana'],
            },
            # Jerez-based services
            {
                'username': 'marta_jerez', 'type': 'offer',
                'title': 'Clases de guitarra flamenca',
                'description': 'Clases particulares y grupales de toque flamenco.',
                'category': cat.get('Arte y Creatividad'), 'duration': 60, 'credits': 2,
                'tag_names': ['presencial', 'fines-de-semana'],
            },
            {
                'username': 'jose_jerez', 'type': 'offer',
                'title': 'Restauración de muebles antiguos',
                'description': 'Restauración y reparación de muebles de madera en Jerez.',
                'category': cat.get('Hogar'), 'duration': 120, 'credits': 3,
                'tag_names': ['presencial', 'flexible'],
            },
            {
                'username': 'juan_jerez', 'type': 'request',
                'title': 'Ayuda mudanza local',
                'description': 'Busco ayuda con una mudanza en la ciudad, preferiblemente con furgoneta.',
                'category': cat.get('Hogar'), 'duration': 180, 'credits': 4,
                'tag_names': ['presencial', 'fines-de-semana'],
            },
            {
                'username': 'elena_madrid', 'type': 'offer',
                'title': 'Conversación en inglés para trámites',
                'description': 'Practicamos inglés útil para entrevistas, viajes y gestiones administrativas.',
                'category': cat.get('Idiomas'), 'duration': 60, 'credits': 1,
                'tag_names': ['online', 'entre-semana'],
            },
            {
                'username': 'diego_madrid', 'type': 'offer',
                'title': 'Entrenamiento funcional en Retiro',
                'description': 'Sesiones adaptadas para mejorar movilidad, fuerza y constancia semanal.',
                'category': cat.get('Deporte y Bienestar'), 'duration': 60, 'credits': 2,
                'tag_names': ['presencial', 'principiantes'],
            },
            {
                'username': 'sofia_madrid', 'type': 'request',
                'title': 'Busco ayuda para grabar un podcast',
                'description': 'Necesito asesoramiento básico de sonido para grabar entrevistas en casa.',
                'category': cat.get('Tecnología'), 'duration': 90, 'credits': 2,
                'tag_names': ['presencial', 'flexible'],
            },
            {
                'username': 'raul_madrid', 'type': 'offer',
                'title': 'Montaje de audio para eventos pequeños',
                'description': 'Configuro micrófonos, altavoces y grabación sencilla para charlas o reuniones.',
                'category': cat.get('Eventos'), 'duration': 120, 'credits': 3,
                'tag_names': ['presencial', 'fines-de-semana'],
            },
            {
                'username': 'nuria_barcelona', 'type': 'offer',
                'title': 'Taller de ilustración digital',
                'description': 'Aprende bocetado, color y exportación de piezas sencillas para redes.',
                'category': cat.get('Arte y Creatividad'), 'duration': 90, 'credits': 2,
                'tag_names': ['online', 'principiantes'],
            },
            {
                'username': 'pau_barcelona', 'type': 'offer',
                'title': 'Cocina saludable de aprovechamiento',
                'description': 'Planificamos recetas económicas para aprovechar ingredientes de temporada.',
                'category': cat.get('Cocina'), 'duration': 120, 'credits': 2,
                'tag_names': ['presencial', 'flexible'],
            },
            {
                'username': 'laia_barcelona', 'type': 'offer',
                'title': 'Primeros auxilios para familias',
                'description': 'Sesión práctica de prevención, reacción ante accidentes y botiquín doméstico.',
                'category': cat.get('Deporte y Bienestar'), 'duration': 90, 'credits': 2,
                'tag_names': ['presencial', 'principiantes'],
            },
            {
                'username': 'marc_barcelona', 'type': 'request',
                'title': 'Busco fotos para mi portfolio web',
                'description': 'Necesito una sesión sencilla para renovar mi imagen profesional.',
                'category': cat.get('Arte y Creatividad'), 'duration': 60, 'credits': 2,
                'tag_names': ['presencial', 'entre-semana'],
            },
            {
                'username': 'clara_valencia', 'type': 'offer',
                'title': 'Taller de plantas mediterráneas',
                'description': 'Consejos para elegir, cuidar y reproducir plantas resistentes al clima local.',
                'category': cat.get('Hogar'), 'duration': 90, 'credits': 2,
                'tag_names': ['presencial', 'fines-de-semana'],
            },
            {
                'username': 'toni_valencia', 'type': 'offer',
                'title': 'Puesta a punto de bicicletas',
                'description': 'Revisión de frenos, cambios, presión y ajustes básicos para moverte por la ciudad.',
                'category': cat.get('Hogar'), 'duration': 60, 'credits': 2,
                'tag_names': ['presencial', 'urgente'],
            },
            {
                'username': 'ines_valencia', 'type': 'offer',
                'title': 'Ruta de historia del arte valenciano',
                'description': 'Paseo guiado por edificios y plazas con contexto histórico accesible.',
                'category': cat.get('Educación'), 'duration': 120, 'credits': 2,
                'tag_names': ['presencial', 'fines-de-semana'],
            },
            {
                'username': 'sergio_valencia', 'type': 'request',
                'title': 'Busco plantas resistentes para terraza',
                'description': 'Quiero mejorar una terraza pequeña con especies fáciles de cuidar.',
                'category': cat.get('Hogar'), 'duration': 60, 'credits': 1,
                'tag_names': ['presencial', 'flexible'],
            },
            {
                'username': 'rocio_sevilla', 'type': 'offer',
                'title': 'Apoyo escolar de primaria',
                'description': 'Refuerzo de lectura, matemáticas y hábitos de estudio para niñas y niños.',
                'category': cat.get('Educación'), 'duration': 60, 'credits': 1,
                'tag_names': ['presencial', 'entre-semana'],
            },
            {
                'username': 'alvaro_sevilla', 'type': 'offer',
                'title': 'Ruta histórica por la Alameda',
                'description': 'Paseo comentado por la historia del barrio y sus espacios culturales.',
                'category': cat.get('Educación'), 'duration': 90, 'credits': 2,
                'tag_names': ['presencial', 'fines-de-semana'],
            },
            {
                'username': 'paula_sevilla', 'type': 'offer',
                'title': 'Arreglos básicos de ropa',
                'description': 'Enseño a hacer bajos, coser botones y ajustar prendas sencillas.',
                'category': cat.get('Hogar'), 'duration': 90, 'credits': 2,
                'tag_names': ['presencial', 'principiantes'],
            },
            {
                'username': 'manuel_sevilla', 'type': 'request',
                'title': 'Busco apoyo para ordenar facturas',
                'description': 'Necesito ayuda para digitalizar recibos y organizar documentos domésticos.',
                'category': cat.get('Tecnología'), 'duration': 60, 'credits': 1,
                'tag_names': ['presencial', 'flexible'],
            },
            {
                'username': 'belen_jerez', 'type': 'offer',
                'title': 'Repostería tradicional jerezana',
                'description': 'Taller práctico de dulces caseros para celebraciones y meriendas.',
                'category': cat.get('Cocina'), 'duration': 120, 'credits': 2,
                'tag_names': ['presencial', 'fines-de-semana'],
            },
            {
                'username': 'ismael_jerez', 'type': 'offer',
                'title': 'Configuración segura del móvil',
                'description': 'Revisamos copias de seguridad, contraseñas, privacidad y apps básicas.',
                'category': cat.get('Tecnología'), 'duration': 60, 'credits': 1,
                'tag_names': ['presencial', 'urgente'],
            },
            {
                'username': 'carmen_jerez', 'type': 'offer',
                'title': 'Iniciación a sevillanas',
                'description': 'Clase amable para aprender pasos básicos y mejorar coordinación.',
                'category': cat.get('Arte y Creatividad'), 'duration': 60, 'credits': 1,
                'tag_names': ['presencial', 'principiantes'],
            },
            {
                'username': 'luis_jerez', 'type': 'request',
                'title': 'Busco ayuda para restaurar una mesa',
                'description': 'Tengo una mesa antigua y quiero aprender a lijarla y protegerla bien.',
                'category': cat.get('Hogar'), 'duration': 120, 'credits': 3,
                'tag_names': ['presencial', 'flexible'],
            },
        ]

        services = []
        for data in services_data:
            tag_names_list = data.pop('tag_names', [])
            # Allow specifying user by username in services_data
            username = data.pop('username', None)
            if username:
                data['user'] = users_map.get(username)
            if not data.get('user'):
                continue
            if not Service.objects.filter(title=data['title'], user=data['user']).exists():
                service = Service.objects.create(**data)
                tags_to_add = Tag.objects.filter(name__in=tag_names_list)
                service.tags.set(tags_to_add)
                services.append(service)
                self.stdout.write(f'  ✔ Servicio: {service.title}')
            else:
                services.append(Service.objects.get(title=data['title'], user=data['user']))

        return services

    def _create_trades(self, users, services):
        now = timezone.now()
        users_map = {u.username: u for u in users}
        services_map = {(s.user.username, s.title): s for s in services}
        trades_data = [
            {
                'service': services[2], 'offerer': users[1], 'requester': users[0],
                'status': 'completed', 'scheduled_date': now - timedelta(days=10),
                'credits_amount': 2, 'notes': 'Primera sesión de introducción a Python.',
                'completed_at': now - timedelta(days=10, hours=2),
            },
            {
                'service': services[3], 'offerer': users[2], 'requester': users[1],
                'status': 'completed', 'scheduled_date': now - timedelta(days=5),
                'credits_amount': 1, 'notes': 'Sesión de yoga matutina.',
                'completed_at': now - timedelta(days=5, hours=1),
            },
            {
                'service': services[4], 'offerer': users[3], 'requester': users[4],
                'status': 'in_progress', 'scheduled_date': now - timedelta(hours=2),
                'credits_amount': 2, 'notes': 'Revisión del cuadro eléctrico.',
            },
            {
                'service': services[5], 'offerer': users[4], 'requester': users[0],
                'status': 'accepted', 'scheduled_date': now + timedelta(days=3),
                'credits_amount': 3, 'notes': 'Sesión fotográfica en el parque.',
            },
            {
                'service': services[1], 'offerer': users[1], 'requester': users[0],
                'status': 'pending', 'scheduled_date': now + timedelta(days=7),
                'credits_amount': 1,
            },
            {
                'service_username': 'diego_madrid',
                'service_title': 'Entrenamiento funcional en Retiro',
                'offerer_username': 'diego_madrid', 'requester_username': 'elena_madrid',
                'status': 'completed', 'scheduled_date': now - timedelta(days=18),
                'credits_amount': 2, 'notes': 'Primera sesión de movilidad y fuerza suave.',
                'completed_at': now - timedelta(days=18, hours=1),
            },
            {
                'service_username': 'raul_madrid',
                'service_title': 'Montaje de audio para eventos pequeños',
                'offerer_username': 'raul_madrid', 'requester_username': 'sofia_madrid',
                'status': 'accepted', 'scheduled_date': now + timedelta(days=4),
                'credits_amount': 3, 'notes': 'Prueba de micro y grabadora para una entrevista.',
            },
            {
                'service_username': 'nuria_barcelona',
                'service_title': 'Taller de ilustración digital',
                'offerer_username': 'nuria_barcelona', 'requester_username': 'marc_barcelona',
                'status': 'completed', 'scheduled_date': now - timedelta(days=14),
                'credits_amount': 2, 'notes': 'Bocetos para renovar iconos del portfolio.',
                'completed_at': now - timedelta(days=14, hours=2),
            },
            {
                'service_username': 'laia_barcelona',
                'service_title': 'Primeros auxilios para familias',
                'offerer_username': 'laia_barcelona', 'requester_username': 'pau_barcelona',
                'status': 'pending', 'scheduled_date': now + timedelta(days=6),
                'credits_amount': 2, 'notes': 'Sesión práctica para el comedor comunitario.',
            },
            {
                'service_username': 'toni_valencia',
                'service_title': 'Puesta a punto de bicicletas',
                'offerer_username': 'toni_valencia', 'requester_username': 'ines_valencia',
                'status': 'completed', 'scheduled_date': now - timedelta(days=9),
                'credits_amount': 2, 'notes': 'Ajuste de frenos antes de una ruta por el centro.',
                'completed_at': now - timedelta(days=9, hours=1),
            },
            {
                'service_username': 'clara_valencia',
                'service_title': 'Taller de plantas mediterráneas',
                'offerer_username': 'clara_valencia', 'requester_username': 'sergio_valencia',
                'status': 'in_progress', 'scheduled_date': now - timedelta(hours=4),
                'credits_amount': 2, 'notes': 'Selección de plantas para terraza soleada.',
            },
            {
                'service_username': 'rocio_sevilla',
                'service_title': 'Apoyo escolar de primaria',
                'offerer_username': 'rocio_sevilla', 'requester_username': 'manuel_sevilla',
                'status': 'completed', 'scheduled_date': now - timedelta(days=12),
                'credits_amount': 1, 'notes': 'Organización de fichas y lectura semanal.',
                'completed_at': now - timedelta(days=12, hours=1),
            },
            {
                'service_username': 'paula_sevilla',
                'service_title': 'Arreglos básicos de ropa',
                'offerer_username': 'paula_sevilla', 'requester_username': 'alvaro_sevilla',
                'status': 'accepted', 'scheduled_date': now + timedelta(days=2),
                'credits_amount': 2, 'notes': 'Ajuste de pantalón para una visita guiada.',
            },
            {
                'service_username': 'ismael_jerez',
                'service_title': 'Configuración segura del móvil',
                'offerer_username': 'ismael_jerez', 'requester_username': 'belen_jerez',
                'status': 'completed', 'scheduled_date': now - timedelta(days=7),
                'credits_amount': 1, 'notes': 'Copia de seguridad y revisión de privacidad.',
                'completed_at': now - timedelta(days=7, hours=1),
            },
            {
                'service_username': 'carmen_jerez',
                'service_title': 'Iniciación a sevillanas',
                'offerer_username': 'carmen_jerez', 'requester_username': 'luis_jerez',
                'status': 'pending', 'scheduled_date': now + timedelta(days=9),
                'credits_amount': 1, 'notes': 'Clase inicial antes de una reunión familiar.',
            },
        ]

        trades = []
        for data in trades_data:
            service_username = data.pop('service_username', None)
            service_title = data.pop('service_title', None)
            offerer_username = data.pop('offerer_username', None)
            requester_username = data.pop('requester_username', None)

            if service_username and service_title:
                data['service'] = services_map.get((service_username, service_title))
            if offerer_username:
                data['offerer'] = users_map.get(offerer_username)
            if requester_username:
                data['requester'] = users_map.get(requester_username)
            if not data.get('service') or not data.get('offerer') or not data.get('requester'):
                continue

            completed_at = data.pop('completed_at', None)
            trade, created = Trade.objects.get_or_create(
                service=data['service'],
                offerer=data['offerer'],
                requester=data['requester'],
                defaults={**data, 'completed_at': completed_at},
            )

            if created and trade.status == 'completed':
                # Transacción normal de créditos
                Transaction.objects.get_or_create(
                    user=trade.requester, trade=trade,
                    defaults={
                        'amount': decimal.Decimal(-trade.credits_amount),
                        'transaction_type': Transaction.Type.DEBIT,
                    },
                )
                Transaction.objects.get_or_create(
                    user=trade.offerer, trade=trade,
                    defaults={
                        'amount': decimal.Decimal(trade.credits_amount),
                        'transaction_type': Transaction.Type.CREDIT,
                    },
                )
                self.stdout.write(f'  ✔ Trade completado: #{trade.pk}')
            elif created:
                self.stdout.write(f'  ✔ Trade {trade.status}: #{trade.pk}')

            trades.append(trade)

        return trades

    def _create_conversations(self, users, trades):
        users_map = {u.username: u for u in users}
        convs_data = [
            (users[0], users[1], [
                ('carlos_lopez', '¡Hola María! Vi que te interesa aprender Python.'),
                ('maria_garcia', 'Sí, tengo muchas ganas. ¿Cuándo podemos empezar?'),
                ('carlos_lopez', 'Cuando quieras. ¿El próximo martes a las 10h?'),
                ('maria_garcia', '¡Perfecto! Nos vemos entonces.'),
            ]),
            (users[2], users[1], [
                ('ana_martinez', 'Carlos, ¿te animarías a hacer una sesión de yoga?'),
                ('carlos_lopez', 'Me lo estaba planteando. ¿Necesito experiencia previa?'),
                ('ana_martinez', 'Para nada, es apto para todos los niveles.'),
            ]),
            ('elena_madrid', 'diego_madrid', [
                ('elena_madrid', 'Hola Diego, me interesa probar una sesión funcional sin mucha intensidad.'),
                ('diego_madrid', 'Perfecto, empezamos suave y ajustamos según cómo te sientas.'),
                ('elena_madrid', 'Genial. ¿Podemos quedar cerca del Retiro esta semana?'),
            ]),
            ('sofia_madrid', 'raul_madrid', [
                ('sofia_madrid', 'Raúl, quiero grabar entrevistas en casa y no sé por dónde empezar.'),
                ('raul_madrid', 'Te puedo ayudar con micro, niveles y una configuración sencilla.'),
                ('sofia_madrid', 'Me vendría genial hacer una prueba antes del viernes.'),
            ]),
            ('nuria_barcelona', 'marc_barcelona', [
                ('marc_barcelona', 'Núria, busco un estilo visual más cálido para mi portfolio.'),
                ('nuria_barcelona', 'Podemos preparar una paleta y varios iconos base en la primera sesión.'),
                ('marc_barcelona', 'Perfecto, llevo referencias y lo revisamos online.'),
            ]),
            ('pau_barcelona', 'laia_barcelona', [
                ('pau_barcelona', 'Laia, ¿podrías dar una sesión de primeros auxilios para el equipo del comedor?'),
                ('laia_barcelona', 'Claro, podemos centrarnos en prevención y respuesta rápida.'),
                ('pau_barcelona', 'Lo organizo para la semana que viene. Gracias.'),
            ]),
            ('ines_valencia', 'toni_valencia', [
                ('ines_valencia', 'Toni, mi bici necesita frenos antes de una ruta.'),
                ('toni_valencia', 'Sin problema, la revisamos y vemos si necesita zapatas nuevas.'),
                ('ines_valencia', 'La llevo mañana por la tarde.'),
            ]),
            ('sergio_valencia', 'clara_valencia', [
                ('sergio_valencia', 'Clara, mi terraza tiene muchísimo sol. ¿Qué plantas aguantarían?'),
                ('clara_valencia', 'Te preparo opciones mediterráneas resistentes y fáciles de mantener.'),
                ('sergio_valencia', 'Perfecto, así también aprovecho para fotografiarlas bien.'),
            ]),
            ('manuel_sevilla', 'rocio_sevilla', [
                ('manuel_sevilla', 'Rocío, necesito ordenar material escolar y rutinas de lectura.'),
                ('rocio_sevilla', 'Podemos montar una pauta semanal muy sencilla.'),
                ('manuel_sevilla', 'Me parece justo lo que necesitamos.'),
            ]),
            ('alvaro_sevilla', 'paula_sevilla', [
                ('alvaro_sevilla', 'Paula, ¿podrías enseñarme a arreglar un bajo de pantalón?'),
                ('paula_sevilla', 'Sí, y te dejo una guía práctica para repetirlo en casa.'),
                ('alvaro_sevilla', 'Estupendo, llevo el pantalón y un costurero básico.'),
            ]),
            ('belen_jerez', 'ismael_jerez', [
                ('belen_jerez', 'Ismael, quiero asegurar el móvil antes de usarlo para pedidos.'),
                ('ismael_jerez', 'Revisamos copias, bloqueo, permisos y contraseñas.'),
                ('belen_jerez', 'Perfecto, así me quedo tranquila.'),
            ]),
            ('luis_jerez', 'carmen_jerez', [
                ('luis_jerez', 'Carmen, me gustaría aprender los pasos básicos de sevillanas.'),
                ('carmen_jerez', 'Claro, empezamos con ritmo y coordinación sin prisas.'),
                ('luis_jerez', 'Entonces reservo una tarde de la semana que viene.'),
            ]),
        ]

        for user1, user2, messages in convs_data:
            if isinstance(user1, str):
                user1 = users_map.get(user1)
            if isinstance(user2, str):
                user2 = users_map.get(user2)
            if not user1 or not user2:
                continue

            created_conv = False
            for conv in Conversation.objects.prefetch_related('participants'):
                ids = sorted(p.id for p in conv.participants.all())
                if ids == sorted([user1.id, user2.id]):
                    conversation = conv
                    break
            else:
                conversation = Conversation.objects.create()
                conversation.participants.set([user1, user2])
                created_conv = True

            if created_conv:
                user_map = {user1.username: user1, user2.username: user2}
                for username, content in messages:
                    sender = user_map.get(username)
                    if sender:
                        Message.objects.create(
                            conversation=conversation,
                            sender=sender,
                            content=content,
                            read=True,
                        )
                self.stdout.write(f'  ✔ Conversación entre {user1.username} y {user2.username}')

    def _create_reviews(self, users, trades):
        completed_trades = [t for t in trades if t.status == 'completed']

        reviews_data = [
            {
                'trade': completed_trades[0],
                'reviewer': users[0], 'reviewee': users[1],
                'rating': 5, 'comment': 'Carlos es un profesor fantástico. Muy paciente y explica todo muy claro.',
            },
            {
                'trade': completed_trades[0],
                'reviewer': users[1], 'reviewee': users[0],
                'rating': 5, 'comment': 'María es una alumna muy entusiasta y aprende rapidísimo.',
            },
            {
                'trade': completed_trades[1],
                'reviewer': users[1], 'reviewee': users[2],
                'rating': 4, 'comment': 'Ana es una profesora excelente. La clase de yoga fue muy relajante.',
            },
        ]

        for data in reviews_data:
            if not Review.objects.filter(trade=data['trade'], reviewer=data['reviewer']).exists():
                Review.objects.create(**data)
                data['reviewee'].update_rating()
                self.stdout.write(
                    f'  ✔ Reseña: {data["reviewer"].username} → {data["reviewee"].username} ({data["rating"]}★)'
                )
