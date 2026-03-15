"""
Comando de gestión para inicializar las 12 categorías de TimeCircle.

Uso:
    python manage.py seed_categories

Es idempotente: si una categoría ya existe, la actualiza con el icono/descripción
sin crear duplicados.
"""

from django.core.management.base import BaseCommand
from api.models import Category


CATEGORIES = [
    {
        'name':        'Hogar',
        'description': 'Reparaciones, limpieza, mudanzas, bricolaje y jardinería.',
        'icon':        'Home',
    },
    {
        'name':        'Tecnología',
        'description': 'Soporte informático, reparación de dispositivos, programación y diseño web.',
        'icon':        'Laptop',
    },
    {
        'name':        'Educación',
        'description': 'Clases particulares, idiomas, música, tutorías y apoyo escolar.',
        'icon':        'BookOpen',
    },
    {
        'name':        'Salud y Cuidados',
        'description': 'Cuidado de personas mayores, niños o mascotas, acompañamiento y bienestar.',
        'icon':        'Heart',
    },
    {
        'name':        'Transporte',
        'description': 'Desplazamientos, recados, entrega de paquetes y acompañamiento.',
        'icon':        'Car',
    },
    {
        'name':        'Cocina',
        'description': 'Cocinar, repostería, clases de cocina y preparación de comidas.',
        'icon':        'ChefHat',
    },
    {
        'name':        'Arte y Creatividad',
        'description': 'Diseño gráfico, fotografía, manualidades, música y artes escénicas.',
        'icon':        'Palette',
    },
    {
        'name':        'Idiomas',
        'description': 'Traducción, interpretación, conversación y enseñanza de idiomas.',
        'icon':        'Languages',
    },
    {
        'name':        'Deporte y Bienestar',
        'description': 'Entrenamiento personal, yoga, pilates, deportes y actividades al aire libre.',
        'icon':        'Dumbbell',
    },
    {
        'name':        'Mascotas',
        'description': 'Paseo, guardería, cuidado y adiestramiento de mascotas.',
        'icon':        'PawPrint',
    },
    {
        'name':        'Eventos',
        'description': 'Organización de eventos, fotografía, animación y decoración.',
        'icon':        'PartyPopper',
    },
    {
        'name':        'Otros',
        'description': 'Cualquier otro servicio o habilidad no incluida en las categorías anteriores.',
        'icon':        'MoreHorizontal',
    },
]


class Command(BaseCommand):
    help = 'Inicializa (o actualiza) las 12 categorías de servicios de TimeCircle.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('Inicializando categorías...'))
        created_count = 0
        updated_count = 0

        for data in CATEGORIES:
            obj, created = Category.objects.update_or_create(
                name=data['name'],
                defaults={
                    'description': data['description'],
                    'icon':        data['icon'],
                },
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  ✔  Creada: {obj.name}'))
            else:
                updated_count += 1
                self.stdout.write(f'  ↺  Actualizada: {obj.name}')

        self.stdout.write(
            self.style.SUCCESS(
                f'\n¡Listo! {created_count} categorías creadas, {updated_count} actualizadas.'
            )
        )
