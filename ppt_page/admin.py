from django.contrib import admin
from .models import PPt_Page, Page_and_Doc, Page_and_Template

@admin.register(PPt_Page)
class PPtPageAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'description')
    search_fields = ('name',)

@admin.register(Page_and_Doc)
class PageAndDocAdmin(admin.ModelAdmin):
    list_display = ('id', 'ppt_page', 'document')
    # list_filter = ('ppt_page', 'document')

@admin.register(Page_and_Template)
class PageAndTemplateAdmin(admin.ModelAdmin):
    list_display = ('id', 'ppt_page', 'ppt_template')
    # list_filter = ('ppt_page', 'ppt_template')