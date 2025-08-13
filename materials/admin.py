from django.contrib import admin
from .models import Material_Task, Document

@admin.register(Material_Task)
class Material_TaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'description')
    search_fields = ('name',)

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'task')
    list_filter = ('task',)
    search_fields = ('name',)
