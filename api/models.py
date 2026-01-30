from django.db import models
from django.db.models import Q, F
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Gender(models.TextChoices):
        MALE = 'M', _("Male")
        FEMALE = 'F', _("Female")
        OTHER = 'O', _("Other")

    dni = models.CharField(max_length=20, unique=True)
    birth_date = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=1,
        choices=Gender.choices,
        default=Gender.OTHER
    )
    coins = models.IntegerField(default=0)

    class Meta:
        db_table = "user_account" # 'user' is a reserved word in Postgres

class Tag(models.Model):
    name = models.CharField(max_length=50)
    description = models.TextField(max_length=200, default="No description")

    class Meta:
        db_table = "tag"

    def __str__(self):
        return self.name

class Skill(models.Model):
    name = models.CharField(max_length=30, unique=True)
    description = models.TextField(max_length=200, default="No description")
    tags = models.ManyToManyField(Tag, related_name="skills")

    class Meta:
        db_table = "skill"

class UserSkill(models.Model):
    class Level(models.IntegerChoices):
        BASIC = 0, _('Basic')
        INTERMEDIATE = 1, _('Intermediate')
        EXPERT = 2, _('Expert')

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_skills")
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    level = models.IntegerField(choices=Level.choices, default=Level.BASIC)
    years_experience = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "user_skill"
        unique_together = ("user", "skill")

class Service(models.Model):
    title = models.CharField(max_length=70)
    description = models.TextField(max_length=300, blank=True)
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name="offered_services")
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "service"

class Trade(models.Model):
    class Status(models.IntegerChoices):
        REQUESTED = 0, _('Requested')
        NEGOTIATING = 1, _('Negotiating')
        ACCEPTED = 2, _('Accepted')
        CANCELED = 3, _('Canceled')
        COMPLETED = 4, _('Completed')

    client = models.ForeignKey(User, on_delete=models.PROTECT, related_name="trades_as_client")
    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name="trades")
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    status = models.IntegerField(choices=Status.choices, default=Status.REQUESTED)

    class Meta:
        db_table = "trade"
        constraints = [
            models.CheckConstraint(
                condition=Q(end_date__gt=F('start_date')),
                name='valid_trade_dates'
            )
        ]

class Transaction(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="transactions")
    trade = models.ForeignKey(Trade, on_delete=models.CASCADE)
    amount = models.IntegerField()
    date_issued = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "transaction"

class Message(models.Model):
    trade = models.ForeignKey(Trade, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField(max_length=500)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "message"

class Rating(models.Model):
    trade = models.ForeignKey(Trade, on_delete=models.CASCADE, related_name="ratings")
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="given_ratings")
    target = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_ratings")
    subject = models.CharField(max_length=100)
    comment = models.TextField(max_length=2000)
    grade = models.SmallIntegerField()

    class Meta:
        db_table = "rating"
        constraints = [
            models.CheckConstraint(
                condition=Q(grade__range=(1, 5)),
                name='grade_range_1_to_5'
            )
        ]