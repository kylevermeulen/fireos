UPDATE transactions 
SET l1_category = 'Utilities & Bills', l2_category = 'Indonesia Utility & Bills'
WHERE source_account_name = 'Permata'
AND description ILIKE '%TRF BIFAST KE LISA MICHELLE CROSBY%';