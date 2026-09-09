-- Aroham (lzzdfsphevmzbkkoskxb) — remove throwaway test users/orders created
-- during Yashasvi verification. Run in the Supabase SQL editor.
begin;
with test_users as (
  select id from users
  where full_name in ('E2E Test Devotee','E2E Devotee','E2E R2','E2E Final','Walkthrough Test',
                      'E2E Walkthrough','RZP Integ','RZP Integ Test','RZP clean','Webhook Test',
                      'Razorpay Test','Gorse FB Test')
     or email ~ '^9[0-9]{9}@Nakshra\.in$'
),
test_orders as ( select id from orders where user_id in (select id from test_users) )
delete from order_items where order_id in (select id from test_orders);
delete from payments   where order_id in (select id from (select id from orders where user_id in (select id from users where full_name in ('E2E Test Devotee','E2E Devotee','E2E R2','E2E Final','Walkthrough Test','E2E Walkthrough','RZP Integ','RZP Integ Test','RZP clean','Webhook Test','Razorpay Test','Gorse FB Test') or email ~ '^9[0-9]{9}@Nakshra\.in$')) t);
delete from orders     where user_id in (select id from users where full_name in ('E2E Test Devotee','E2E Devotee','E2E R2','E2E Final','Walkthrough Test','E2E Walkthrough','RZP Integ','RZP Integ Test','RZP clean','Webhook Test','Razorpay Test','Gorse FB Test') or email ~ '^9[0-9]{9}@Nakshra\.in$');
delete from cart_items where user_id in (select id::text from users where full_name in ('E2E Test Devotee','E2E Devotee','E2E R2','E2E Final','Walkthrough Test','E2E Walkthrough','RZP Integ','RZP Integ Test','RZP clean','Webhook Test','Razorpay Test','Gorse FB Test') or email ~ '^9[0-9]{9}@Nakshra\.in$');
delete from users      where full_name in ('E2E Test Devotee','E2E Devotee','E2E R2','E2E Final','Walkthrough Test','E2E Walkthrough','RZP Integ','RZP Integ Test','RZP clean','Webhook Test','Razorpay Test','Gorse FB Test') or email ~ '^9[0-9]{9}@Nakshra\.in$';
commit;
