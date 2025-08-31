# Targeted Cleanup Backup Restoration Instructions

## Backup Details
- **Created**: 2025-08-31T09-19-45-499Z
- **Type**: Pre-cleanup safety backup
- **Active Tables**: 19 tables with data
- **Empty Tables**: 66 tables verified empty

## To Restore (if needed):
1. Stop the application
2. Use Supabase dashboard or CLI to restore tables
3. Import data from JSON files in this directory
4. Restart the application

## Files in this backup:
- properties-data.json (98 rows)
- units-data.json (8 rows)
- tenants-data.json (11 rows)
- tenancy_agreements-data.json (8 rows)
- property_users-data.json (98 rows)
- property_document_status-data.json (28 rows)
- property_documents-data.json (9 rows)
- property_acquisition_costs-data.json (9 rows)
- property_payment_installments-data.json (10 rows)
- property_purchase_price_history-data.json (4 rows)
- property_subdivisions-data.json (2 rows)
- notification_rules-data.json (3 rows)
- notification_templates-data.json (2 rows)
- permission_sections-data.json (5 rows)
- permission_templates-data.json (4 rows)
- permission_detail_types-data.json (4 rows)
- land_amenities-data.json (18 rows)
- purchase_pipeline_field_security-data.json (21 rows)
- purchase_pipeline_audit_log-data.json (254 rows)

## Tables verified safe to remove:
- activities_audit
- agents
- amenities
- approvals
- bank_mpesa_recons
- clients
- commissions
- data_access_logs
- disputes_logs
- encumbrances
- expenses
- in_app_notifications
- invoices
- land_details
- land_media
- land_property_amenities
- land_rates
- listings
- maintenance_requests
- maintenance_tickets
- marketing_leads
- meter_readings
- mpesa_transactions
- notification_history
- notification_settings
- offers_reservations
- owners
- parcel_owners
- parcels
- payment_allocations
- payment_plans
- payments
- permission_audit_log
- plots
- pricing_zones
- property_audit_log
- property_handover_costs
- property_payment_records
- property_sale_info
- property_sale_status_history
- property_subdivision_costs
- purchase_pipeline_change_approvals
- purchase_pipeline_costs
- receipts
- rent_invoices
- reservation_requests
- sale_agreements
- security_events
- shared_meters
- subdivision_plots
- subdivisions
- surveys
- tasks_reminders
- transfers_titles
- unit_amenities
- unit_shared_meters
- units_media
- user_activities
- user_invitations
- user_next_of_kin
- user_permissions
- user_profiles
- utility_accounts
- utility_ledger
- value_add_projects
- wayleaves_easements

## ⚠️ Tables with unexpected data:
None - all tables verified empty
