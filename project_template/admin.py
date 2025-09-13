from django.contrib import admin
from .models import Project_Template

# Register your models here.
@admin.register(Project_Template)
class Project_Template_Admin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)