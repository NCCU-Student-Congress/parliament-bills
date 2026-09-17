UPDATE users
SET permission_role = CASE
  WHEN permission_role = 'admin' THEN 'secretariat_admin'
  ELSE 'legislator'
END
WHERE permission_role NOT IN ('legislator', 'secretariat_admin');
