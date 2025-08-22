-- Create test subdivision property for testing the subdivision progress tracker
-- This script creates a test subdivision and property to demonstrate the progress tracker

DO $$
DECLARE
    test_user_id UUID;
    test_subdivision_id UUID;
    test_property_id UUID;
    existing_property_id UUID;
    initial_stages JSONB;
BEGIN
    -- Get the first available user
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found. Please create a user first.';
    END IF;

    -- Get an existing property to use as the original property for subdivision
    SELECT id INTO existing_property_id FROM properties LIMIT 1;
    
    IF existing_property_id IS NULL THEN
        RAISE EXCEPTION 'No properties found. Please create a property first.';
    END IF;

    -- Generate UUIDs for our test records
    test_subdivision_id := gen_random_uuid();
    test_property_id := gen_random_uuid();

    -- Create initial subdivision pipeline stages
    initial_stages := '[
        {
            "stage_id": 1,
            "status": "Completed",
            "started_date": "2025-08-15T00:00:00Z",
            "completed_date": "2025-08-17T00:00:00Z",
            "notes": "Initial planning and design completed successfully",
            "documents": []
        },
        {
            "stage_id": 2,
            "status": "Completed",
            "started_date": "2025-08-17T00:00:00Z",
            "completed_date": "2025-08-19T00:00:00Z",
            "notes": "Survey ordered and scheduled with ABC Surveyors",
            "documents": []
        },
        {
            "stage_id": 3,
            "status": "In Progress",
            "started_date": "2025-08-19T00:00:00Z",
            "notes": "Survey work in progress, beacons being placed",
            "documents": []
        },
        {
            "stage_id": 4,
            "status": "Not Started",
            "notes": "",
            "documents": []
        },
        {
            "stage_id": 5,
            "status": "Not Started",
            "notes": "",
            "documents": []
        },
        {
            "stage_id": 6,
            "status": "Not Started",
            "notes": "",
            "documents": []
        },
        {
            "stage_id": 7,
            "status": "Not Started",
            "notes": "",
            "documents": []
        }
    ]'::JSONB;

    -- Check if test subdivision already exists
    IF NOT EXISTS (SELECT 1 FROM property_subdivisions WHERE subdivision_name = 'Test Subdivision - Mzima Gardens') THEN
        -- Create test subdivision entry
        INSERT INTO property_subdivisions (
            id,
            original_property_id,
            subdivision_name,
            subdivision_plan_reference,
            surveyor_name,
            surveyor_contact,
            total_plots_planned,
            total_plots_created,
            subdivision_status,
            approval_authority,
            survey_cost_kes,
            approval_fees_kes,
            infrastructure_cost_kes,
            expected_plot_value_kes,
            target_completion_date,
            subdivision_notes,
            pipeline_stages,
            current_stage,
            overall_progress,
            created_by,
            assigned_to,
            created_at,
            updated_at
        ) VALUES (
            test_subdivision_id,
            existing_property_id,
            'Test Subdivision - Mzima Gardens',
            'SUB/2025/001',
            'ABC Surveyors Ltd',
            '+254700123456',
            12,
            0,
            'SURVEY_COMPLETED',
            'Nairobi County Planning Department',
            150000.00,
            75000.00,
            500000.00,
            2500000.00,
            '2025-12-31',
            'Test subdivision for demonstrating the subdivision progress tracker functionality',
            initial_stages,
            3,
            29,
            test_user_id,
            test_user_id,
            NOW(),
            NOW()
        );

        RAISE NOTICE 'Created test subdivision with ID: %', test_subdivision_id;
    ELSE
        -- Get existing subdivision ID
        SELECT id INTO test_subdivision_id FROM property_subdivisions WHERE subdivision_name = 'Test Subdivision - Mzima Gardens';
        RAISE NOTICE 'Test subdivision already exists with ID: %', test_subdivision_id;
    END IF;

    -- Check if test property already exists
    IF NOT EXISTS (SELECT 1 FROM properties WHERE name = 'Test Plot 1 - Mzima Gardens Subdivision') THEN
        -- Create the test property from subdivision
        INSERT INTO properties (
            id,
            name,
            physical_address,
            property_type,
            lat,
            lng,
            notes,
            landlord_id,
            property_source,
            source_reference_id,
            parent_property_id,
            lifecycle_status,
            subdivision_date,
            total_area_sqm,
            total_area_acres,
            sale_price_kes,
            acquisition_notes,
            created_at,
            updated_at
        ) VALUES (
            test_property_id,
            'Test Plot 1 - Mzima Gardens Subdivision',
            'Plot 1, Mzima Gardens Subdivision, Nairobi, Kenya',
            'RESIDENTIAL_LAND',
            -1.2921,
            36.8219,
            'Test property created from subdivision process for testing the subdivision progress tracker',
            test_user_id,
            'SUBDIVISION_PROCESS',
            test_subdivision_id,
            existing_property_id,
            'ACTIVE',
            '2025-08-20',
            2000.00,
            0.494,
            2500000.00,
            'Created from Test Subdivision - Mzima Gardens. Plot 1 of 12 planned plots.',
            NOW(),
            NOW()
        );

        RAISE NOTICE 'Created test property with ID: %', test_property_id;
        RAISE NOTICE 'Property source: SUBDIVISION_PROCESS';
        RAISE NOTICE 'Source reference ID: %', test_subdivision_id;
    ELSE
        RAISE NOTICE 'Test property already exists';
    END IF;

    RAISE NOTICE 'Test subdivision property setup complete!';
    RAISE NOTICE 'Navigate to the property "Test Plot 1 - Mzima Gardens Subdivision" and go to the Documents tab to see the subdivision progress tracker.';

END $$;
