from django.contrib import admin
from .models import Project, PPt_Generate

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'created_at', 'updated_at', 'user')
    list_filter = ('user', 'created_at')
    search_fields = ('name',)


@admin.register(PPt_Generate)
class PPt_Generate_Admin(admin.ModelAdmin):
    list_display = ('id', 'project__name')