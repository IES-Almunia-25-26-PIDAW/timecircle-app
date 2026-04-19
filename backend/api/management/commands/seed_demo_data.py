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
        self.stdout.write('  Admin: admin@timecircle.com / Admin1234!')

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
                'credits': decimal.Decimal('8.0'),
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
        ]

        users = []
        for data in demo_users:
            if not User.objects.filter(username=data['username']).exists():
                user = User.objects.create_user(**data)
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
        ]

        services = []
        for data in services_data:
            tag_names_list = data.pop('tag_names', [])
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
        ]

        trades = []
        for data in trades_data:
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
        ]

        for user1, user2, messages in convs_data:
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