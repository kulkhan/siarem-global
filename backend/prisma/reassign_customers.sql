-- ============================================================
-- Müşteri Tenant Yeniden Atama Scripti
-- Belirli müşterileri ve tüm bağlı kayıtları yeni bir
-- company'ye taşır.
--
-- KULLANIM:
--   1. TARGET_COMPANY_ID → hedef şirketin ID'si
--   2. CUSTOMER_SHORTCODES listesini doldurun
--   3. Önce SELECT ile kontrol edin, sonra UPDATE'leri çalıştırın
-- ============================================================

-- ── PARAMETRELER ─────────────────────────────────────────────

-- Hedef şirket ID'si (companies tablosundan):
-- SELECT id, name, domain FROM companies;
-- SELECT * FROM public.customers order by "shortCode";

DO $$
DECLARE
    target_company_id TEXT := 'cmm5bbl38000012r2c1z2qr77';  -- ← DEĞİŞTİR

    -- Taşınacak müşterilerin shortCode listesi:
    customer_codes TEXT[] := ARRAY[
        'ADTOR',
        'ARMADOR'
        -- ← buraya shortCode'ları ekle (virgülle ayır)
    ];

    customer_ids TEXT[];
    n INTEGER;
BEGIN

    -- 1. shortCode'lardan customer ID'lerini topla
    SELECT ARRAY_AGG(id) INTO customer_ids
    FROM customers
    WHERE "shortCode" = ANY(customer_codes);

    IF customer_ids IS NULL OR array_length(customer_ids, 1) = 0 THEN
        RAISE EXCEPTION 'Hiç müşteri bulunamadı! shortCode listesini kontrol edin.';
    END IF;

    RAISE NOTICE 'Taşınacak müşteri sayısı: %', array_length(customer_ids, 1);
    RAISE NOTICE 'Müşteri ID''leri: %', customer_ids;

    -- ── 2. CUSTOMERS ──────────────────────────────────────────
    UPDATE customers SET company_id = target_company_id WHERE id = ANY(customer_ids);
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'customers güncellendi: % satır', n;

    -- ── 3. CONTACTS ──────────────────────────────────────────
    UPDATE contacts SET company_id = target_company_id WHERE "customerId" = ANY(customer_ids);
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'contacts güncellendi: % satır', n;

    -- ── 4. SHIPS ─────────────────────────────────────────────
    UPDATE ships SET company_id = target_company_id WHERE "customerId" = ANY(customer_ids);
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'ships güncellendi: % satır', n;

    -- ── 5. SERVICES ──────────────────────────────────────────
    UPDATE services SET company_id = target_company_id WHERE "customerId" = ANY(customer_ids);
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'services güncellendi: % satır', n;

    -- ── 6. QUOTES ────────────────────────────────────────────
    UPDATE quotes SET company_id = target_company_id WHERE "customerId" = ANY(customer_ids);
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'quotes güncellendi: % satır', n;

    -- ── 7. INVOICES ──────────────────────────────────────────
    UPDATE invoices SET company_id = target_company_id WHERE "customerId" = ANY(customer_ids);
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'invoices güncellendi: % satır', n;

    -- ── 8. MEETINGS ──────────────────────────────────────────
    UPDATE meetings SET company_id = target_company_id WHERE "customerId" = ANY(customer_ids);
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'meetings güncellendi: % satır', n;

    -- ── 9. DOCUMENTS ─────────────────────────────────────────
    UPDATE documents SET company_id = target_company_id WHERE "customerId" = ANY(customer_ids);
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'documents güncellendi: % satır', n;

    -- ── 10. EXPENSES ─────────────────────────────────────────
    UPDATE expenses SET company_id = target_company_id WHERE "customerId" = ANY(customer_ids);
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'expenses güncellendi: % satır', n;

    RAISE NOTICE '✅ Tamamlandı. Tüm kayıtlar % şirketine taşındı.', target_company_id;

END $$;
