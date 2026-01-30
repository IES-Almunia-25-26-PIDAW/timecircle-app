import os
import django
import random
from faker import Faker

# Configuración de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings') # <--- Revisa que este sea el nombre de tu carpeta de settings
django.setup()

from django.apps import apps
from django.db import models
from django.contrib.auth.models import User

fake = Faker()
APP_NAME = 'api'

def run_seed(num_records=30):
    app_config = apps.get_app_config(APP_NAME)
    # Ordenamos los modelos: User primero, luego el resto
    models_list = list(app_config.get_models())
    
    for model in models_list:
        print(f"Sembrando modelo: {model.__name__}...")
        
        for _ in range(num_records):
            obj = model()
            for field in model._meta.fields:
                if field.primary_key or not field.editable:
                    continue
                
                # Manejo de Relaciones (Foreign Keys)
                if isinstance(field, models.ForeignKey):
                    related_model = field.remote_field.model
                    # Intentamos obtener un registro aleatorio del modelo relacionado
                    all_related = list(related_model.objects.all())
                    if all_related:
                        setattr(obj, field.name, random.choice(all_related))
                    else:
                        # Si no hay registros en la relación, nos saltamos este campo
                        continue

                # Campos de Texto
                elif isinstance(field, models.CharField):
                    setattr(obj, field.name, fake.word()[:field.max_length])
                elif isinstance(field, models.TextField):
                    setattr(obj, field.name, fake.paragraph())
                
                # Números y Booleanos
                elif isinstance(field, models.IntegerField):
                    setattr(obj, field.name, random.randint(1, 100))
                elif isinstance(field, models.DecimalField):
                    setattr(obj, field.name, random.uniform(1.0, 100.0))
                elif isinstance(field, models.BooleanField):
                    setattr(obj, field.name, random.choice([True, False]))
                
                # Fechas
                elif isinstance(field, models.DateTimeField):
                    setattr(obj, field.name, fake.date_time_this_year(tzinfo=django.utils.timezone.get_current_timezone()))

            try:
                obj.save()
            except Exception as e:
                pass # Ignoramos errores de duplicados o restricciones complejas
                
    print(f"¡Hecho! Se intentaron crear {num_records} registros por tabla.")

if __name__ == '__main__':
    run_seed(30)