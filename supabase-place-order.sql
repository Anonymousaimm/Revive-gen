create or replace function public.place_order(
  p_customer_name text, p_phone text, p_email text, p_address text,
  p_city text, p_notes text, p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id bigint;
  v_order_number text;
  v_subtotal numeric(10,2) := 0;
  v_item jsonb;
  v_product_id text;
  v_product_name text;
  v_unit_price numeric(10,2);
  v_qty integer;
  v_shipping numeric(10,2) := 0;
begin
  if nullif(trim(p_customer_name), '') is null then raise exception 'Customer name is required'; end if;
  if nullif(trim(p_phone), '') is null then raise exception 'Phone number is required'; end if;
  if nullif(trim(p_address), '') is null then raise exception 'Address is required'; end if;
  if nullif(trim(p_city), '') is null then raise exception 'City is required'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := v_item->>'product_id';
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 99 then raise exception 'Invalid quantity'; end if;
    case v_product_id
      when 'aurum' then v_product_name := 'Aurum'; v_unit_price := 165;
      when 'ember-bloom' then v_product_name := 'Ember Bloom'; v_unit_price := 178;
      when 'velvet-oud' then v_product_name := 'Velvet Oud'; v_unit_price := 210;
      else raise exception 'Invalid product';
    end case;
    v_subtotal := v_subtotal + (v_unit_price * v_qty);
  end loop;

  v_order_number := 'RG-' || to_char(now(), 'YYYYMMDD') || '-' ||
                    lpad(nextval('public.orders_id_seq')::text, 5, '0');

  insert into public.orders
    (order_number, customer_name, phone, email, address, city, notes, subtotal, shipping, total, status)
  values
    (v_order_number, trim(p_customer_name), trim(p_phone),
     nullif(trim(coalesce(p_email,'')), ''), trim(p_address), trim(p_city),
     nullif(trim(coalesce(p_notes,'')), ''), v_subtotal, v_shipping,
     v_subtotal + v_shipping, 'pending')
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := v_item->>'product_id';
    v_qty := (v_item->>'quantity')::integer;
    case v_product_id
      when 'aurum' then v_product_name := 'Aurum'; v_unit_price := 165;
      when 'ember-bloom' then v_product_name := 'Ember Bloom'; v_unit_price := 178;
      when 'velvet-oud' then v_product_name := 'Velvet Oud'; v_unit_price := 210;
      else raise exception 'Invalid product';
    end case;
    insert into public.order_items
      (order_id, product_id, product_name, quantity, unit_price, line_total)
    values
      (v_order_id, v_product_id, v_product_name, v_qty, v_unit_price, v_unit_price * v_qty);
  end loop;

  return jsonb_build_object(
    'order_id', v_order_id, 'order_number', v_order_number,
    'subtotal', v_subtotal, 'shipping', v_shipping, 'total', v_subtotal + v_shipping
  );
end;
$$;

revoke all on function public.place_order(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.place_order(text,text,text,text,text,text,jsonb) to anon;
