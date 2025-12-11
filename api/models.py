from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import AbstractUser

class Usuario(AbstractUser):
  SEXO_CHOICES = [
    ('M', _("Masculino")),
    ('F', _("Femenino")),
    ('O', _("Otro"))
  ]

  class Meta:
    db_table = "usuario"

  dni = models.CharField(max_length=9,unique=True)
  fecha_nacimiento = models.DateField(auto_now_add=True,null=False,blank=True)
  sexo = models.CharField(choices=SEXO_CHOICES, db_default=('O', _('Otro')))

class Etiqueta(models.Model):
  class Meta:
    db_table = "etiqueta"

  id = models.IntegerField(auto_created=True,primary_key=True)
  nombre = models.TextField(max_length=50)
  descripcion = models.TextField(max_length=200,default="Sin descripción")

class Habilidad(models.Model):
  class Meta:
    db_table = "habilidad"

  id = models.IntegerField(auto_created=True,primary_key=True)
  nombre = models.TextField(max_length=30,unique=True)
  descripcion = models.TextField(max_length=200,default="Sin descripción")
  etiquetas = models.ManyToManyField(Etiqueta)


class UsuarioHabilidad(models.Model):
  class Meta:
    db_table = "usuario_habilidad"
    unique_together = ("usuario","habilidad")

  class Nivel(models.IntegerChoices):
    BASICO = 0, _('Básico')
    INTERMEDIO = 1, _('Intermedio')
    EXPERTO = 2, _('Experto')

  usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="habilidades")
  habilidad = models.ForeignKey(Habilidad, on_delete=models.CASCADE)
  nivel = models.CharField(
      max_length=20,
      choices=Nivel.choices,
      blank=True,
      default=Nivel.BASICO
  )
  anios_experiencia = models.PositiveIntegerField(default=0)

class Servicio(models.Model):
  class Meta:
    db_table = "servicio"

  id = models.IntegerField(auto_created=True,primary_key=True)
  titulo = models.TextField(max_length=70)
  descripcion = models.TextField(max_length=300,blank=True)
  habilidad = models.ForeignKey(Habilidad, on_delete=models.CASCADE)
  solicitante = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING)
  fecha_creacion = models.DateTimeField(auto_now=True)
  activo = models.BooleanField(default=True)

class Intercambio(models.Model):
  class Meta:
    db_table = "intercambio"
    constraints = [
      models.CheckConstraint(
        # Comprueba si la fecha de fin es mayor que fecha de inicio
        check=Q(fecha_final=models.F('fecha_inicio')),
        name='fechas_validas'
      )
    ]
  class Estado(models.IntegerChoices):
    SOLICITADO = 0, _('Solicitado')
    EN_NEGOCIACION = 1, _('En negociación')
    ACEPTADO = 2, _('Aceptado')
    CANCELADO = 3, _('Cancelado')

  id = models.IntegerField(auto_created=True,primary_key=True)
  solicitante = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, related_name="solicitante")
  proveedor = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="proveedor")
  torrijas = models.PositiveIntegerField() # horas
  fecha_inicio = models.DateTimeField(auto_now=True)
  fecha_final = models.DateTimeField()
  estado = models.CharField(
    choices=Estado.choices,
    blank=True,
    default=Estado.SOLICITADO
  )

class Transaccion(models.Model):
  class Meta:
    db_table = "transaccion"

  id = models.IntegerField(auto_created=True,primary_key=True)
  usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
  intercambio = models.ForeignKey(Intercambio, on_delete=models.DO_NOTHING)
  torrijas = models.IntegerField()
  fecha = models.DateTimeField(auto_now=True)

class Mensaje(models.Model):
  class Meta:
    db_table = "mensaje"

  id = models.IntegerField(auto_created=True,primary_key=True)
  intercambio = models.ForeignKey(Intercambio, on_delete=models.CASCADE)
  remitente = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING)
  texto = models.TextField(max_length=500)
  fecha = models.DateTimeField(auto_now=True)