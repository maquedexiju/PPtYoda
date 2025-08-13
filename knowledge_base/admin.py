from django.contrib import admin
from .models import Knowledge_Base

@admin.register(Knowledge_Base)
class KnowledgeBaseAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'created_at', 'updated_at')
    search_fields = ('name',)
    list_filter = ('user',)
    verbose_name = '知识库管理'