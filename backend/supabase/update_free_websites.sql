-- Update the 10 free websites with real URLs
-- Run this in Supabase SQL Editor

UPDATE public.websites SET url = 'https://www.instacart.com', name = 'Instacart' WHERE name = 'Instacart';
UPDATE public.websites SET url = 'https://www.ubereats.com', name = 'Uber Eats' WHERE name = 'Uber Eats';
UPDATE public.websites SET url = 'https://www.taskrabbit.com', name = 'TaskRabbit' WHERE name = 'TaskRabbit';
UPDATE public.websites SET url = 'https://www.freelancer.com', name = 'Freelancer' WHERE name = 'Freelancer';
UPDATE public.websites SET url = 'https://www.ziprecruiter.com', name = 'ZipRecruiter' WHERE name = 'ZipRecruiter';
UPDATE public.websites SET url = 'https://offerup.com', name = 'OfferUp' WHERE name = 'OfferUp';
UPDATE public.websites SET url = 'https://www.vrbo.com', name = 'VRBO' WHERE name = 'VRBO';
UPDATE public.websites SET url = 'https://www.youtube.com', name = 'YouTube' WHERE name = 'YouTube';
UPDATE public.websites SET url = 'https://seatgeek.com', name = 'SeatGeek' WHERE name = 'SeatGeek';
UPDATE public.websites SET url = 'https://www.walmart.com', name = 'Walmart' WHERE name = 'Walmart';

-- Or use this single UPDATE statement:
UPDATE public.websites 
SET url = CASE name
  WHEN 'Instacart' THEN 'https://www.instacart.com'
  WHEN 'Uber Eats' THEN 'https://www.ubereats.com'
  WHEN 'TaskRabbit' THEN 'https://www.taskrabbit.com'
  WHEN 'Freelancer' THEN 'https://www.freelancer.com'
  WHEN 'ZipRecruiter' THEN 'https://www.ziprecruiter.com'
  WHEN 'OfferUp' THEN 'https://offerup.com'
  WHEN 'VRBO' THEN 'https://www.vrbo.com'
  WHEN 'YouTube' THEN 'https://www.youtube.com'
  WHEN 'SeatGeek' THEN 'https://seatgeek.com'
  WHEN 'Walmart' THEN 'https://www.walmart.com'
END
WHERE name IN ('Instacart', 'Uber Eats', 'TaskRabbit', 'Freelancer', 'ZipRecruiter', 'OfferUp', 'VRBO', 'YouTube', 'SeatGeek', 'Walmart');