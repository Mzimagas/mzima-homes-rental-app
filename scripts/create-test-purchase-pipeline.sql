-- Create test purchase pipeline entry and property for testing Documents tab integration
-- This script creates a test purchase pipeline entry and transfers it to a property

-- First, get the current user ID (assuming there's at least one user)
DO $$
DECLARE
    test_user_id UUID;
    test_purchase_id UUID;
    test_property_id UUID;
    initial_stages JSONB;
BEGIN
    -- Get the first available user
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found. Please create a user first.';
    END IF;

    -- Generate UUIDs for our test records
    test_purchase_id := gen_random_uuid();
    test_property_id := gen_random_uuid();

    -- Create initial pipeline stages
    initial_stages := '[
        {
            "stage_id": 1,
            "status": "Completed",
            "started_date": "2024-01-15T00:00:00.000Z",
            "completed_date": "2024-01-20T00:00:00.000Z",
            "notes": "Property identified and initial evaluation completed"
        },
        {
            "stage_id": 2,
            "status": "Completed",
            "started_date": "2024-01-21T00:00:00.000Z",
            "completed_date": "2024-01-25T00:00:00.000Z",
            "notes": "Survey and mapping completed successfully"
        },
        {
            "stage_id": 3,
            "status": "In Progress",
            "started_date": "2024-01-26T00:00:00.000Z",
            "completed_date": null,
            "notes": "Legal verification in progress"
        },
        {
            "stage_id": 4,
            "status": "Not Started",
            "started_date": null,
            "completed_date": null,
            "notes": ""
        },
        {
            "stage_id": 5,
            "status": "Not Started",
            "started_date": null,
            "completed_date": null,
            "notes": ""
        },
        {
            "stage_id": 6,
            "status": "Not Started",
            "started_date": null,
            "completed_date": null,
            "notes": ""
        },
        {
            "stage_id": 7,
            "status": "Not Started",
            "started_date": null,
            "completed_date": null,
            "notes": ""
        },
        {
            "stage_id": 8,
            "status": "Not Started",
            "started_date": null,
            "completed_date": null,
            "notes": ""
        },
        {
            "stage_id": 9,
            "status": "Not Started",
            "started_date": null,
            "completed_date": null,
            "notes": ""
        }
    ]'::jsonb;

    -- Create test purchase pipeline entry
    INSERT INTO purchase_pipeline (
        id,
        property_name,
        property_address,
        property_type,
        seller_name,
        seller_contact,
        asking_price_kes,
        negotiated_price_kes,
        deposit_paid_kes,
        purchase_status,
        target_completion_date,
        legal_representative,
        financing_source,
        expected_rental_income_kes,
        expected_roi_percentage,
        risk_assessment,
        property_condition_notes,
        pipeline_stages,
        current_stage,
        overall_progress,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        test_purchase_id,
        'Test Property - Westlands Apartment',
        'Westlands Road, Nairobi, Kenya',
        'APARTMENT',
        'John Doe',
        '+254700123456',
        8500000.00,
        8000000.00,
        1600000.00,
        'DUE_DILIGENCE',
        '2024-03-15',
        'ABC Legal Associates',
        'Bank Loan + Personal Savings',
        120000.00,
        18.0,
        'Low risk property in prime location. Good infrastructure and access to amenities.',
        'Property is in good condition. Minor renovations needed for kitchen and bathrooms.',
        initial_stages,
        3,
        22,
        test_user_id,
        NOW(),
        NOW()
    );

    -- Create the property record
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
        lifecycle_status,
        purchase_completion_date,
        sale_price_kes,
        expected_rental_income_kes,
        acquisition_notes,
        created_at,
        updated_at
    ) VALUES (
        test_property_id,
        'Test Property - Westlands Apartment',
        'Westlands Road, Nairobi, Kenya',
        'APARTMENT',
        -1.2630,
        36.8063,
        'Test property created from purchase pipeline for Documents tab testing',
        test_user_id,
        'PURCHASE_PIPELINE',
        test_purchase_id,
        'PURCHASED',
        '2024-01-26',
        8000000.00,
        120000.00,
        'Transferred from purchase pipeline. Original asking price: KES 8,500,000',
        NOW(),
        NOW()
    );

    -- Update the purchase pipeline with the property_id
    UPDATE purchase_pipeline 
    SET property_id = test_property_id
    WHERE id = test_purchase_id;

    RAISE NOTICE 'Test purchase pipeline and property created successfully!';
    RAISE NOTICE 'Purchase ID: %', test_purchase_id;
    RAISE NOTICE 'Property ID: %', test_property_id;
    RAISE NOTICE 'Property Name: Test Property - Westlands Apartment';

END $$;
