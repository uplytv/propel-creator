
DO $seed$
DECLARE
  bs jsonb := $data$[
    {
      "username":"assalmarket","name":"Assal Market","category":"Persian Grocery & Bakery",
      "tagline":"Vienna's Persian market & bakery — fresh bread daily",
      "address":"112 Glyndon St NE #200","city":"Vienna, VA 22180","phone":"703-281-0000",
      "rating":"4.3","reviews":"292",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Assal+Market+112+Glyndon+St+NE+%23200+Vienna+VA+22180",
      "hours":{"monday":"9am-9pm","tuesday":"9am-9pm","wednesday":"9am-9pm","thursday":"9am-9pm","friday":"9am-9pm","saturday":"9am-9pm","sunday":"9am-8pm"},
      "services":[{"title":"In-House Bakery & Shirini","description":"Fresh barbari, sangak and Persian pastries baked daily on-site."},{"title":"Fresh Halal Meat","description":"Cut-to-order halal beef, lamb and chicken from our butcher counter."},{"title":"Produce & Groceries","description":"Persian and Middle Eastern staples, fresh herbs and imported basics."},{"title":"Persian Spices","description":"Saffron, sumac, advieh and a full spice wall for every Persian dish."},{"title":"Nowruz & Holiday Specials","description":"Sabzeh, samanu, sweets and everything for your Haft-Seen table."}],
      "testimonials":[{"author":"Verified Google review","text":"The bread is baked fresh in-house every single day and you can smell it the moment you walk in.","rating":5},{"author":"Verified Google review","text":"Best shirini I have had outside of Iran — the napoleons and nokhodchi are exactly right.","rating":5},{"author":"Verified Google review","text":"The owner is so warm and welcoming, always making sure customers find exactly what they need.","rating":5}],
      "posts":[
        "Setting a Haft-Seen table for Nowruz is easier than it looks. Start with the seven S's — sabzeh, samanu, senjed, sir, sib, somaq, serkeh — and add a mirror, candles, colored eggs and a book of Hafez. Come by early in Esfand and we'll help you pick everything you need in one trip.",
        "Not sure where to start with Persian sweets? Try these five: napoleoni (flaky napoleons), nokhodchi (chickpea cookies that melt on your tongue), koloocheh (walnut-filled shortbread), zaban (crisp puff-pastry tongues) and shirini-e keshmeshi (soft raisin drops). We bake them fresh — ask what came out of the oven this morning.",
        "Great barbari should be golden-brown with a light crackle on top, soft and airy inside, and smell faintly sweet — never sour. Press gently: it should spring back, not stay dented. Our loaves come out of the oven every couple of hours, so ask us which batch is freshest before you buy."
      ]
    },
    {
      "username":"stonely","name":"Stonely","category":"Countertop Fabricator",
      "tagline":"Custom stone countertops in Fairfax — measured, cut & installed",
      "address":"3159 Draper Dr A","city":"Fairfax, VA 22031","phone":"","rating":"","reviews":"",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Stonely+3159+Draper+Dr+A+Fairfax+VA+22031",
      "hours":{"monday":"9am-5pm","tuesday":"9am-5pm","wednesday":"9am-5pm","thursday":"9am-5pm","friday":"9am-5pm","saturday":"9am-12pm","sunday":"Closed"},
      "services":[{"title":"Granite","description":"Natural granite countertops sourced, templated and installed for kitchens and baths."},{"title":"Quartz","description":"Engineered quartz in a wide range of colors — durable, low-maintenance and stain-resistant."},{"title":"Marble","description":"Classic marble for statement kitchens, vanities and fireplaces."},{"title":"Quartzite","description":"Natural quartzite with the look of marble and the durability of granite."},{"title":"Free In-Home Measure","description":"Precise laser templating in your home so your finished tops fit right the first time."}],
      "testimonials":[{"author":"Verified Google review","text":"Exquisite countertop — the seam placement and edge polish are flawless.","rating":5},{"author":"Verified Google review","text":"Impeccable craftsmanship from measurement to install. Truly a pro operation.","rating":5},{"author":"Verified Google review","text":"You can see the pride in every cut — the finished kitchen looks better than we imagined.","rating":5}],
      "posts":[
        "Quartz is engineered stone bound with resin, so it's non-porous, stain-resistant and never needs sealing. Granite is 100% natural rock, more heat-resistant with dramatic natural veining, but needs sealing about once a year. For busy family kitchens we usually recommend quartz; for cooks who love one-of-a-kind stone, granite wins.",
        "Most Northern Virginia kitchens land between $60 and $110 per installed square foot, depending on stone choice, edge profile and cutout complexity. A typical 40 sqft kitchen runs $2,800–$4,200 installed. Exotic quartzite and marble sit at the top of that range; standard granite and mid-tier quartz sit at the bottom.",
        "Before you sign anything, ask a fabricator these five questions: 1) Is templating done with a laser and included in the quote? 2) Do you fabricate in-house or subcontract? 3) Are cutouts, edges and installation all in the price? 4) What's the warranty on seams and finish? 5) Can I see the actual slabs before you cut? If any answer is fuzzy, keep looking."
      ]
    },
    {
      "username":"1987gentlemans","name":"1987 Gentleman's Salon","category":"Barbershop",
      "tagline":"Fairfax's 4.9-star gentleman's salon — open 7 days, 9 to 9",
      "address":"8558 Lee Hwy Unit D","city":"Fairfax, VA 22031","phone":"","rating":"4.9","reviews":"111",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=1987+Gentleman%27s+Salon+8558+Lee+Hwy+Unit+D+Fairfax+VA+22031",
      "hours":{"monday":"9am-9pm","tuesday":"9am-9pm","wednesday":"9am-9pm","thursday":"9am-9pm","friday":"9am-9pm","saturday":"9am-9pm","sunday":"9am-9pm"},
      "services":[{"title":"Haircuts","description":"Classic and modern men's haircuts tailored to your hair and face shape."},{"title":"Skin Fades","description":"Precision bald and skin fades with clean, blended transitions."},{"title":"Beard Trim & Shape","description":"Detailed beard shape-ups with clippers and straight razor lines."},{"title":"Hot Towel Shave","description":"Traditional hot towel straight-razor shave with pre-shave oil and balm."},{"title":"Kids Cuts","description":"Patient, friendly cuts for kids of every age."}],
      "testimonials":[{"author":"Verified Google review","text":"My barber actually listens and nails every detail — never had to fix anything at home.","rating":5},{"author":"Verified Google review","text":"They are so great with my kids — patient, quick and always send them out happy.","rating":5},{"author":"Verified Google review","text":"Consistent every single visit. Same barber, same clean fade, no surprises.","rating":5}],
      "posts":[
        "A skin fade takes the sides all the way down to bare skin before blending up; a taper leaves a short, clean length around the ears and neckline. Skin fades read more modern and bold, tapers read cleaner and more traditional. Not sure which suits you? Ask your barber to walk you through both on your first visit.",
        "For a skin fade, plan on every 2 weeks to keep the blend crisp. Classic tapers hold their shape closer to 3–4 weeks. Longer scissor cuts can stretch 4–6 weeks. If your neckline is starting to fuzz or your fade is losing its edge, it's time — book before it starts bothering you.",
        "Keep your beard sharp between visits with three habits: brush it daily to train the hairs, use a lightweight beard oil every morning to stop itch and flakes, and tidy stray neck hairs with a trimmer once a week. Leave the cheek and neckline shape to your barber so the outline stays clean."
      ]
    },
    {
      "username":"autobodyworld","name":"Auto Body World","category":"Collision Repair",
      "tagline":"Fairfax collision repair done right — free estimates",
      "address":"9425 Mathy Dr #E","city":"Fairfax, VA 22031","phone":"703-978-9685","rating":"4.5","reviews":"60",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Auto+Body+World+9425+Mathy+Dr+%23E+Fairfax+VA+22031",
      "hours":{"monday":"8am-6pm","tuesday":"8am-6pm","wednesday":"8am-6pm","thursday":"8am-6pm","friday":"8am-6pm","saturday":"Closed","sunday":"Closed"},
      "services":[{"title":"Collision Repair","description":"Full-service collision and frame repair for cars and light trucks."},{"title":"Dent & Scratch Removal","description":"Small dent, scuff and scratch repairs — often same-day."},{"title":"Bumper Repair","description":"Bumper crack, dent and paint repair without full replacement when possible."},{"title":"Paint Matching","description":"Computer-matched paint blending for a seamless finish on any color."},{"title":"Insurance Claims Help","description":"We work directly with your insurer to make the claim painless."}],
      "testimonials":[{"author":"Verified Google review","text":"Perfect paint match on a tricky pearl color — you cannot tell where the repair ends.","rating":5},{"author":"Verified Google review","text":"Honest, direct estimate. No upsell, no surprises when I picked the car up.","rating":5},{"author":"Verified Google review","text":"Car came back looking better than new. Cleaned inside and out, too.","rating":5}],
      "posts":[
        "Should you file an insurance claim for a fender bender? A good rule: if the repair estimate is close to or below your deductible, pay out of pocket and skip the claim. If damage is clearly more than the deductible, or the other driver was at fault, file it. Get a written estimate first so you can decide with real numbers.",
        "Modern paint matching starts with a spectrophotometer reading of your actual paint — sun-faded panels included. We mix the formula, spray test cards, then tint until the sample disappears against your car in natural light. Only then do we spray the repair and blend into adjacent panels so the fix vanishes.",
        "After a minor accident in Virginia: move to a safe spot if the car drives, turn on hazards, exchange license, insurance and plate info, and photograph both vehicles and the scene from multiple angles. File a police report if there's any injury or over $1,500 in damage. Then call us for a free estimate before agreeing to anything with insurance."
      ]
    },
    {
      "username":"besttailoring","name":"Best Tailoring","category":"Tailor & Alterations",
      "tagline":"Trusted Fairfax tailoring — now under new management",
      "address":"9126 Lee Hwy","city":"Fairfax, VA 22031","phone":"703-641-9333","rating":"","reviews":"",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Best+Tailoring+9126+Lee+Hwy+Fairfax+VA+22031",
      "hours":{"monday":"10am-6pm","tuesday":"10am-6pm","wednesday":"10am-6pm","thursday":"10am-6pm","friday":"10am-6pm","saturday":"10am-3pm","sunday":"Closed"},
      "services":[{"title":"Suit & Jacket Alterations","description":"Shoulder, sleeve, taper and length adjustments so your suit actually fits."},{"title":"Hemming & Tapering","description":"Precise hems and tapering on pants, chinos and jeans."},{"title":"Dress & Gown Alterations","description":"Everyday dresses and formal gowns fitted to the fraction of an inch."},{"title":"Wedding & Formalwear","description":"Bridal, bridesmaid and groomsmen alterations on your timeline."},{"title":"Custom Shirts","description":"Made-to-measure shirts drafted to your exact measurements."},{"title":"Repairs & Zippers","description":"Zippers, linings, patches and everyday repairs handled while you wait when possible."}],
      "testimonials":[{"author":"Verified Google review","text":"Loyal customer for over a decade — always fair, always precise, always kind.","rating":5},{"author":"Verified Google review","text":"The custom shirts fit better than anything off the rack. Measurements were spot-on the first try.","rating":5},{"author":"Verified Google review","text":"Been coming here for years and the new management kept everything I loved about this shop.","rating":5}],
      "posts":[
        "A suit that fits passes five checks: 1) The shoulder seam sits at the edge of your shoulder, not past it. 2) The jacket collar hugs your shirt with no gap. 3) You can slip a flat hand under a buttoned jacket, no more. 4) Sleeves show a quarter inch of shirt cuff. 5) Pants break gently on the shoe. Miss any of these? That's an alteration, not a shopping problem.",
        "Wedding alteration timeline: book your first fitting 8–10 weeks out so we have room for two or three passes. Final fitting is 1–2 weeks before the wedding — never the day before. Bring the exact shoes and undergarments you'll wear. Grooms: same window works for suits and tuxes.",
        "Tapering slims a pant leg from thigh to hem for a modern silhouette; hemming just shortens the length. Most guys need both when they buy off the rack. Ask for a slight taper if you feel your dress pants look boxy — a small change makes a big difference in how the whole outfit reads."
      ]
    },
    {
      "username":"clipandstyle","name":"Clip & Style Shop","category":"Barbershop",
      "tagline":"Vienna's freshly remodeled barbershop — walk-ins welcome",
      "address":"116 Branch Rd SE","city":"Vienna, VA 22180","phone":"703-223-5463","rating":"4.4","reviews":"52",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Clip+%26+Style+Shop+116+Branch+Rd+SE+Vienna+VA+22180",
      "hours":{"monday":"9am-7pm","tuesday":"9am-7pm","wednesday":"9am-7pm","thursday":"9am-7pm","friday":"9am-7pm","saturday":"8am-6pm","sunday":"Closed"},
      "services":[{"title":"Men's Haircuts","description":"Classic and modern cuts for every hair type and style."},{"title":"Beard Trims","description":"Clean beard shape-ups with clippers and razor lines."},{"title":"Kids Cuts","description":"Patient cuts for kids — booster seat and cartoons ready."},{"title":"Shape-Ups","description":"Quick line-ups to sharpen your cut between full appointments."},{"title":"Women's Short Cuts","description":"Short and pixie cuts for women who want a real barber's precision."}],
      "testimonials":[{"author":"Verified Google review","text":"My barber checks in throughout the whole cut — length, sides, neckline — never any surprises at the mirror.","rating":5},{"author":"Verified Google review","text":"So patient with my son. Made his first haircut fun instead of scary.","rating":5},{"author":"Verified Google review","text":"Newly remodeled, spotless chairs and tools. Feels like a proper old-school barbershop again.","rating":5}],
      "posts":[
        "Walk-in or appointment? Walk-ins are perfect for quick line-ups, kids cuts and off-peak weekday visits. Book an appointment for Saturdays, longer scissor work, or if you want a specific barber. Weekends fill fast — call ahead if you have a narrow window.",
        "Your child's first haircut goes better with three moves: come in during a quiet mid-morning slot, bring a favorite toy or show on your phone, and let them sit on your lap the first time if they want. We'll take breaks whenever they need one — this cut is about a good experience, not perfection.",
        "Three low-maintenance cuts if you don't want to be in the chair every two weeks: a classic taper (holds shape 4+ weeks), a textured crop with soft sides (grows out clean), and a longer scissor cut on top with a low fade (still looks intentional at week 5). Ask us which suits your hair type."
      ]
    },
    {
      "username":"fairtailoring","name":"Fair Tailoring","category":"Tailor & Dry Cleaning",
      "tagline":"Fairfax's trusted tailor for gowns, suits & everyday fits",
      "address":"4005 Chestnut St","city":"Fairfax, VA 22030","phone":"703-352-6552","rating":"4.6","reviews":"56",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Fair+Tailoring+4005+Chestnut+St+Fairfax+VA+22030",
      "hours":{"monday":"9am-6pm","tuesday":"9am-6pm","wednesday":"9am-6pm","thursday":"9am-6pm","friday":"9am-6pm","saturday":"9am-4pm","sunday":"Closed"},
      "services":[{"title":"Gown & Formal Alterations","description":"Wedding gowns, bridesmaid dresses and evening wear fitted precisely."},{"title":"Suit Alterations","description":"Full jacket and trouser alterations — shoulders, sleeves, waist, taper, hem."},{"title":"Everyday Hemming","description":"Pants, jeans, skirts and dresses hemmed and taken in."},{"title":"Dry Cleaning","description":"On-site dry cleaning for garments that need cleaning before or after alteration."},{"title":"Keepsake Repurposing","description":"Turn sentimental garments — a parent's shirt, a wedding dress — into pieces you'll actually wear or display."}],
      "testimonials":[{"author":"Verified Google review","text":"Fair prices on formal gown alterations — quoted honestly and stuck to it.","rating":5},{"author":"Verified Google review","text":"The owner is so cheerful and welcoming, makes every visit feel easy.","rating":5},{"author":"Verified Google review","text":"They turned my late father's shirt into a keepsake pillow — creative and beautifully done.","rating":5}],
      "posts":[
        "Formal gown hems typically run $60–$150 depending on fabric, number of layers and whether the hem is horsehair-finished or lace-trimmed. Beaded or heavily embellished hems sit at the higher end because each bead has to be removed and reset by hand. Bring the shoes you'll wear so we hem to the exact right length.",
        "Five clothes almost always worth altering rather than replacing: a well-made suit, a favorite pair of jeans, dress pants that fit everywhere except the waist, a coat that's a size too big in the shoulders, and any dress with sentimental value. Off-the-rack fit is close — tailoring is what makes it yours.",
        "A shirt from someone you loved can become something you use every day. We turn dress shirts into pillows or memory bears, wedding dresses into christening gowns, and neckties into quilt squares. Bring the garment and a rough idea — we'll walk through what's possible before you commit."
      ]
    },
    {
      "username":"jewelrydoctor","name":"The Jewelry Doctor","category":"Jewelry Sales & Repair",
      "tagline":"Vienna's jewelry repair experts — watch your repair under the microscope",
      "address":"440 Maple Ave E","city":"Vienna, VA 22180","phone":"703-255-1330","rating":"4.8","reviews":"76",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=The+Jewelry+Doctor+440+Maple+Ave+E+Vienna+VA+22180",
      "hours":{"monday":"11am-5pm","tuesday":"11am-5pm","wednesday":"11am-5pm","thursday":"11am-5pm","friday":"11am-5pm","saturday":"11am-5pm","sunday":"Closed"},
      "services":[{"title":"Ring Sizing","description":"Precision sizing up or down while preserving your ring's design."},{"title":"Chain & Clasp Repair","description":"Broken links, worn clasps and stretched chains restored on-site."},{"title":"Stone Setting","description":"Reset loose or missing stones — diamonds, colored gems and heirloom stones."},{"title":"Custom Redesign & Resetting","description":"Turn dated or inherited pieces into something you'll actually wear."},{"title":"Engraving","description":"Fine hand and machine engraving for rings, plates and gifts."},{"title":"Fine Jewelry Sales","description":"Carefully selected fine jewelry from working jewelers, not a chain store."}],
      "testimonials":[{"author":"Verified Google review","text":"They showed me every repair step under a microscope — I've never trusted a jeweler more.","rating":5},{"author":"Verified Google review","text":"Honored a rush repair before my flight — had my ring back in two days looking new.","rating":5},{"author":"Verified Google review","text":"Reset my grandmother's stones into a new setting. It's the most stunning piece I own now.","rating":5}],
      "posts":[
        "Ring resizing usually means cutting the shank at the bottom, adding or removing a small piece of matching metal, then soldering and polishing so the seam disappears. Small changes (a half to full size) are quick; large changes may affect stone tension and design and sometimes need reshaping. Come in and we'll show you exactly what your ring needs.",
        "Heirloom stones deserve settings you'll actually wear. We can reset an old diamond into a modern solitaire, combine several small stones into a single statement ring, or rebuild a broken piece using the original stones and metal. Bring the piece and one or two inspiration photos — we'll sketch options in front of you.",
        "Have your fine jewelry inspected once a year — sooner if you wear it daily. A jeweler will check prongs, clasps, chains and stone tension under magnification before something loosens. Ten minutes at the counter can save a lost diamond or a broken chain later. Walk-ins welcome any time we're open."
      ]
    },
    {
      "username":"persepolisrugs","name":"Persepolis Oriental Rugs","category":"Persian & Oriental Rugs",
      "tagline":"Handmade Persian rugs — sales, cleaning & restoration",
      "address":"8453-B Tyco Rd","city":"Vienna, VA 22182","phone":"703-298-7660","rating":"4.6","reviews":"36",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Persepolis+Oriental+Rugs+8453-B+Tyco+Rd+Vienna+VA+22182",
      "hours":{"monday":"Closed","tuesday":"Closed","wednesday":"Closed","thursday":"3pm-6:30pm","friday":"1pm-6:30pm","saturday":"1pm-6:30pm","sunday":"1pm-6:30pm"},
      "services":[{"title":"Handmade Rug Sales","description":"Curated collection of authentic Persian and oriental rugs, tribal to city-woven."},{"title":"Professional Cleaning","description":"Hand-washing and thorough drying built for wool, silk and antique rugs."},{"title":"Repair & Restoration","description":"Reweaving, fringe and edge repair, moth damage and color loss restoration."},{"title":"Appraisals","description":"Written appraisals for insurance, estate or resale."},{"title":"Delivery","description":"Local pickup and delivery for cleaning, restoration and purchases."}],
      "testimonials":[{"author":"Verified Google review","text":"The owner spent an hour teaching us about motifs and knot counts — no pressure to buy, just genuine expertise.","rating":5},{"author":"Verified Google review","text":"Cleaned and restored more than twenty vintage rugs for us with constant updates and photos.","rating":5},{"author":"Verified Google review","text":"Fair pricing and honest advice — steered us to a smaller rug that actually fit the room.","rating":5}],
      "posts":[
        "Every Persian rug tells a story through its motifs: the boteh (paisley) stands for fertility and eternity, the herati (fish-in-pond) represents abundance, and the tree of life connects earth to sky. Tribal rugs use bolder, freer versions of the same symbols; city rugs render them tighter and more formal. Bring a rug in and we'll read it with you.",
        "Wool rugs are durable, forgiving and perfect for living rooms and hallways — they hide traffic and clean easily. Silk rugs are finer, glossier and best for low-traffic spaces or wall display. Most fine Persian rugs mix both: wool foundation with silk highlights. Feel a corner of each on your next visit — the difference is obvious in the hand.",
        "A handmade oriental rug should be professionally cleaned every 3–5 years, sooner if you have pets, children or heavy traffic. Vacuum weekly (no beater bar), rotate 180 degrees once a year to even out wear, and address spills within minutes with cool water and a white cloth. Never wet-clean a wool rug yourself — the dyes are hand-set and can bleed."
      ]
    },
    {
      "username":"topsofthetown","name":"Tops of the Town","category":"Countertops",
      "tagline":"Northern Virginia countertops since 1990 — granite, quartz & laminate",
      "address":"2800 Dorr Ave Ste L","city":"Fairfax, VA 22031","phone":"703-242-8100","rating":"4.9","reviews":"18",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Tops+of+the+Town+2800+Dorr+Ave+Ste+L+Fairfax+VA+22031",
      "hours":{"monday":"8am-5pm","tuesday":"8am-5pm","wednesday":"8am-5pm","thursday":"8am-5pm","friday":"8am-5pm","saturday":"10am-3pm","sunday":"Closed"},
      "services":[{"title":"Kitchen Countertops","description":"Granite, quartz and laminate kitchen tops fabricated and installed."},{"title":"Bathroom Vanities","description":"Custom vanity tops in stone or solid surface with integrated or drop-in sinks."},{"title":"Sink Cutouts & Replacement","description":"New sink cutouts and swaps into existing tops — undermount and drop-in."},{"title":"Crack Repairs","description":"Structural crack and chip repair on stone that others say cannot be saved."},{"title":"Seamless Large-Slab Installs","description":"Grain-matched large slabs installed with minimum seams for a continuous look."}],
      "testimonials":[{"author":"Verified Google review","text":"Fixed a cracked sink surround two other shops told me could not be done. Looks brand new.","rating":5},{"author":"Verified Google review","text":"Grain-matched a U-shaped kitchen with only two seams — the flow across the counters is beautiful.","rating":5},{"author":"Verified Google review","text":"You can feel 35 years of pride in this shop. Meticulous from measure to install.","rating":5}],
      "posts":[
        "Cracked stone countertop? Don't assume replacement is your only option. Hairline cracks on granite and quartz are often repairable with color-matched resin and re-polishing — invisible in most lighting. Full-length breaks near a sink cutout usually mean replacement. Send us a photo before you demo anything; a five-minute look can save a full slab.",
        "Seam placement is the single biggest visual choice in a stone kitchen. A good fabricator hides seams away from sightlines, off major joints, and always in the least-lit area. Two well-placed seams in a U-shaped kitchen read as one continuous slab; two bad ones ruin an otherwise perfect install. Ask to see the seam map before your job is cut.",
        "For family kitchens, quartz usually wins: non-porous, stain-resistant, no sealing, and consistent color across the whole run. Granite still shines when you want one-of-a-kind natural veining and you don't mind resealing yearly. Bring your cabinet color and a floor plan and we'll narrow options in ten minutes at the showroom."
      ]
    }
  ]$data$::jsonb;
  b jsonb;
  new_user_id uuid;
  new_profile_id uuid;
  seed_email text;
BEGIN
  FOR b IN SELECT * FROM jsonb_array_elements(bs) LOOP
    -- Idempotency: skip if the username is already taken
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = b->>'username') THEN
      CONTINUE;
    END IF;

    seed_email := (b->>'username') || '+seed@uply.local';

    -- Skip if a prior partial run already created the auth user
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = seed_email) THEN
      CONTINUE;
    END IF;

    new_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_sso_user, is_anonymous
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      seed_email,
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', b->>'name', 'seeded', true),
      false, false
    );

    -- handle_new_user() auto-created a profile row; grab and enrich it
    SELECT id INTO new_profile_id FROM public.profiles WHERE user_id = new_user_id;

    UPDATE public.profiles SET
      username = b->>'username',
      display_name = b->>'name',
      account_type = 'business',
      business_status = 'draft',
      onboarding_complete = true,
      is_approved = true
    WHERE id = new_profile_id;

    INSERT INTO public.business_details(
      profile_id, business_name, category, tagline, address, city, phone,
      google_rating, google_reviews_count, google_maps_url,
      hours, services, testimonials
    ) VALUES (
      new_profile_id,
      b->>'name', b->>'category', b->>'tagline', b->>'address', b->>'city',
      NULLIF(b->>'phone',''),
      NULLIF(b->>'rating','')::numeric,
      NULLIF(b->>'reviews','')::int,
      b->>'maps_url',
      (b->'hours'),
      (b->'services'),
      (b->'testimonials')
    ) ON CONFLICT (profile_id) DO NOTHING;

    INSERT INTO public.posts(user_id, content, category)
    SELECT new_user_id, value#>>'{}', 'business'
    FROM jsonb_array_elements(b->'posts');
  END LOOP;
END
$seed$;
