DO $seed$
DECLARE
  bs jsonb := $data$[
    {
      "username":"walterschoeshine","name":"Walter's Shoe Shine","category":"Shoe Shine & Restoration",
      "tagline":"West LA's 5-star shoe shine — 570+ perfect reviews",
      "address":"10854 Santa Monica Blvd","city":"Los Angeles, CA 90025","phone":"310-857-0469",
      "rating":"5.0","reviews":"573",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Walter%27s+Shoe+Shine+10854+Santa+Monica+Blvd+Los+Angeles+CA+90025",
      "hours":{"monday":"Closed","tuesday":"Closed","wednesday":"9:30am-5pm","thursday":"9:30am-5pm","friday":"9:30am-5pm","saturday":"9:30am-5pm","sunday":"9:30am-4:30pm"},
      "services":[{"title":"Mirror Shine","description":"High-gloss mirror shine on dress shoes and boots that stands out in any room."},{"title":"Leather Restoration","description":"Reviving dried, cracked and neglected leather back to a rich, healthy finish."},{"title":"Shoe Cleaning","description":"Deep cleaning for everyday leather shoes and sneakers."},{"title":"Suede & Boot Care","description":"Suede brushing, protective treatment and boot conditioning done right."}],
      "testimonials":[{"author":"Verified Google review","text":"The mirror shine on my dress shoes stood out in every room I walked into.","rating":5},{"author":"Verified Google review","text":"Restored a pair of shoes I thought were beyond saving — they look almost new.","rating":5},{"author":"Verified Google review","text":"One-man shop that runs with the efficiency of a full team. In and out fast, work is flawless.","rating":5}],
      "posts":[
        "How often should you shine dress shoes? For daily-wear leather, a quick brush after each wear and a full polish every 2–3 weeks keeps the finish healthy. Boots and shoes worn in rotation can stretch to once a month. Anything with visible dryness or scuffs — bring them in, don't wait.",
        "Dried, cracked leather is not dead. Start by cleaning off old polish and grime, then feed the leather with a conditioner and let it soak in for a full day. Only then do we buff, layer wax and finish with a shine. Rush any step and you lock the dryness in — that's why restoration takes patience.",
        "Suede care basics: brush in one direction with a proper suede brush after every wear, waterproof before you wear them out for the first time, and never use liquid polish. For fresh stains, brush dry first — most lift right off. Bring them in for anything set-in and we'll handle it."
      ]
    },
    {
      "username":"armandoshoes","name":"Armando Shoes and Repair","category":"Shoe Repair",
      "tagline":"Westwood's trusted cobbler — designer resoles done in a day",
      "address":"1457 Westwood Blvd","city":"Los Angeles, CA 90024","phone":"310-477-7978",
      "rating":"4.8","reviews":"205",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Armando+Shoes+and+Repair+1457+Westwood+Blvd+Los+Angeles+CA+90024",
      "hours":{"monday":"8am-6pm","tuesday":"8am-6pm","wednesday":"8am-6pm","thursday":"8am-6pm","friday":"8am-6pm","saturday":"8am-6pm","sunday":"Closed"},
      "services":[{"title":"Sole Replacement","description":"Full and half sole replacement on dress shoes, boots and designer footwear."},{"title":"Designer Shoe Protection","description":"Thin protective soles applied to designer shoes so the originals never touch pavement."},{"title":"Heel Repair","description":"Heel tips, block heels and full heel rebuilds for shoes and boots."},{"title":"Bag & Purse Repair","description":"Handle re-stitching, hardware fixes and lining repairs on handbags."},{"title":"Boot Restoration","description":"Full boot restoration — resole, recondition and refinish."}],
      "testimonials":[{"author":"Verified Google review","text":"The protective soles they added to my designer heels are so thin you can't tell — and the originals stay perfect.","rating":5},{"author":"Verified Google review","text":"One-day turnaround on a luxury resole is unheard of. Everywhere else quoted two weeks.","rating":5},{"author":"Verified Google review","text":"Honest advice on what's worth repairing and what isn't. Saved me from spending on a pair that was done.","rating":5}],
      "posts":[
        "Thin protective soles on designer shoes are the single best investment you can make. They add almost no thickness, don't change the look, and take all the wear the original leather sole would take. Bring new designer shoes in before the first wear — protection is easy before there's any damage to fix.",
        "Repair or replace? A good rule: if the upper (the leather part on top) is still in good shape, almost anything below it can be fixed — soles, heels, lining, stitching. If the upper is cracked through or coming apart from the sole all the way around, that's usually the end. Bring them in and we'll tell you honestly.",
        "Making boots last a decade comes down to three habits: rotate at least two pairs so leather can rest and dry, condition every couple of months to keep leather supple, and resole at the first sign of the sole thinning — not after the welt is damaged. Wait too long and a $60 resole becomes a $200 rebuild."
      ]
    },
    {
      "username":"paritailoring","name":"Pari Tailoring","category":"Tailor & Alterations",
      "tagline":"Santa Monica tailoring with couture-gown precision",
      "address":"2116 Wilshire Blvd Ste 210","city":"Santa Monica, CA 90403","phone":"310-739-7513",
      "rating":"4.8","reviews":"173",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Pari+Tailoring+2116+Wilshire+Blvd+Ste+210+Santa+Monica+CA+90403",
      "hours":{"monday":"8:30am-5:30pm","tuesday":"8:30am-5:30pm","wednesday":"8:30am-5:30pm","thursday":"8:30am-5:30pm","friday":"8:30am-5:30pm","saturday":"9am-4pm","sunday":"Closed"},
      "services":[{"title":"Gown & Bridal Alterations","description":"Wedding gowns, bridesmaid and evening gowns fit with couture-level precision."},{"title":"Suit Tailoring","description":"Shoulder, sleeve, taper and length work on suits and jackets."},{"title":"Everyday Alterations","description":"Hemming, tapering, waist adjustments and repairs on daily wear."},{"title":"Custom Fitting","description":"Full custom fittings drawing on a background in couture gown design."},{"title":"Rush Jobs","description":"Rush turnaround for last-minute events and travel."}],
      "testimonials":[{"author":"Verified Google review","text":"You can see her custom gown design background in every stitch — the interior finish is as clean as the outside.","rating":5},{"author":"Verified Google review","text":"She rescued my wedding dress three days before the ceremony. Fit was perfect, no rush charge nightmares.","rating":5},{"author":"Verified Google review","text":"Always ready exactly when promised. Never once had to call and ask if my things were done.","rating":5}],
      "posts":[
        "Bridal alteration timeline: first fitting 8–10 weeks out, second fitting 4–5 weeks out, final fitting 1–2 weeks before the wedding — never the day before. Bring your actual shoes and undergarments to every fitting. Weight can shift; that's normal — the schedule is built to catch it.",
        "Couture fitting means we fit the garment to your body, not the other way around. That's shoulders, bust, waist and hips checked live, seams opened and re-set to your shape, and the hang of the fabric watched from every angle. It's slower — and the finished piece looks like it was made for you because it was.",
        "Rush alterations guide: for a simple hem or basic taper, 24–48 hours is usually possible. For a gown or a full suit, plan on at least a week even for rush. If you're traveling for an event, drop the piece off the day you land and pick up before you leave — that's the standard rush window."
      ]
    },
    {
      "username":"dreamthreading","name":"Dream Threading Studio","category":"Brow Threading",
      "tagline":"LA's brow perfectionist — clients loyal for 8+ years",
      "address":"2255 A W Pico Blvd","city":"Los Angeles, CA 90006","phone":"714-880-2790",
      "rating":"4.9","reviews":"180",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Dream+Threading+Studio+2255+A+W+Pico+Blvd+Los+Angeles+CA+90006",
      "hours":{"monday":"11am-6pm","tuesday":"11am-6pm","wednesday":"11am-6pm","thursday":"11am-6pm","friday":"11am-6pm","saturday":"11am-6pm","sunday":"Closed"},
      "services":[{"title":"Eyebrow Threading","description":"Precision brow shaping with cotton thread — clean lines, no harsh chemicals."},{"title":"Full Face Threading","description":"Full face threading for upper lip, chin, cheeks and forehead."},{"title":"Brow Shaping & Repair","description":"Rebuilding overplucked or unevenly shaped brows over a series of visits."},{"title":"Tinting","description":"Brow tinting to fill in sparse areas and deepen natural color."}],
      "testimonials":[{"author":"Verified Google review","text":"She fixed brows I had botched everywhere else. First shop in years I trust to touch them.","rating":5},{"author":"Verified Google review","text":"Been coming here 8 years. Won't go anywhere else — nobody else gets the shape right.","rating":5},{"author":"Verified Google review","text":"Precise, affordable, professional. In and out in ten minutes and the shape is perfect every time.","rating":5}],
      "posts":[
        "Threading vs waxing: threading picks up individual hairs, so it's more precise around the brow line and gentler on skin — no burning, no lifted skin. Waxing is faster on large areas like the leg or back. For brows, upper lip and chin, threading almost always wins on shape and skin health.",
        "Growing out botched brows is a plan, not a single appointment. Start by leaving them alone for 6–8 weeks — no tweezing at home. Come in for a clean-up on the outer strays only, then a proper shape once there's enough hair to work with. Full recovery usually takes 3–4 months.",
        "How often should you thread? Most people are on a 2–3 week cycle for brows and upper lip. Coarse or fast-growing hair may pull that closer to two weeks. Threading also gets faster and less sensitive the more consistent you are — your skin adapts."
      ]
    },
    {
      "username":"amwatchrepair","name":"A M Watch Repair","category":"Watch & Clock Repair",
      "tagline":"Los Feliz watch repair — 20+ years of expert hands",
      "address":"1727 N Vermont Ave","city":"Los Angeles, CA 90027","phone":"323-661-9118",
      "rating":"4.5","reviews":"70",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=A+M+Watch+Repair+1727+N+Vermont+Ave+Los+Angeles+CA+90027",
      "hours":{"monday":"8am-6pm","tuesday":"8am-6pm","wednesday":"8am-6pm","thursday":"8am-6pm","friday":"8am-6pm","saturday":"8am-4pm","sunday":"Closed"},
      "services":[{"title":"Watch Repair","description":"Movement service, mainspring and crown repairs on mechanical and quartz watches."},{"title":"Battery Replacement","description":"Fast battery swaps with proper gaskets and pressure testing where needed."},{"title":"Band Sizing & Links","description":"Link adjustments, band replacements and clasp repairs."},{"title":"Vintage & Heirloom Restoration","description":"Careful restoration of family and vintage watches, dial and hand work included."},{"title":"Clock Repair","description":"Mantle, wall and grandfather clock service."}],
      "testimonials":[{"author":"Verified Google review","text":"He revived a sentimental watch that had been dead for years. Runs perfectly again.","rating":5},{"author":"Verified Google review","text":"Quick link adjustments and honest advice — often no charge for small fixes.","rating":5},{"author":"Verified Google review","text":"20+ years of expertise shows the moment he opens a watch. Wouldn't trust mine anywhere else.","rating":5}],
      "posts":[
        "Why watches stop: on quartz watches, 90% of the time it's the battery — a $10 fix. On mechanical watches, stopping usually means dried lubricants or dust in the movement, which needs a full service every 4–7 years depending on wear. Bring it in and we'll tell you exactly which one you're dealing with.",
        "Heirloom watch restoration is patient work. We start with a full teardown and cleaning, replace only the parts that must be replaced, and preserve the original dial, hands and case wherever possible. A restoration that respects the watch's age is worth more than one that makes it look brand new.",
        "Battery vs movement issue? Quick test: does the second hand tick in a stutter (skipping 2–4 seconds at a time)? That's a dying battery — replace it. Does the watch stop and start intermittently, or run fast/slow? That's usually the movement and needs service. Either way, bring it in — we can diagnose in a couple of minutes."
      ]
    },
    {
      "username":"ninastailor","name":"Nina's Custom Tailor Shop","category":"Tailor & Alterations",
      "tagline":"Santa Monica's detail-obsessed tailor — open 7 days",
      "address":"1622 Wilshire Blvd","city":"Santa Monica, CA 90403","phone":"310-310-3399",
      "rating":"4.9","reviews":"50",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Nina%27s+Custom+Tailor+Shop+1622+Wilshire+Blvd+Santa+Monica+CA+90403",
      "hours":{"monday":"8am-6pm","tuesday":"8am-6pm","wednesday":"8am-6pm","thursday":"8am-6pm","friday":"8am-6pm","saturday":"8am-3pm","sunday":"9am-1pm"},
      "services":[{"title":"Evening Wear Alterations","description":"Cocktail dresses, gowns and formalwear fit and finished for the event."},{"title":"Daily Wear Tailoring","description":"Hems, tapers, waist adjustments and repairs on everyday clothes."},{"title":"Bridal & Bridesmaid","description":"Wedding and bridesmaid dresses fit across a full alteration timeline."},{"title":"Fit Consultations","description":"Sit-down consultations to plan what a piece actually needs to fit right."}],
      "testimonials":[{"author":"Verified Google review","text":"She treats every dress with extra care — you can tell she genuinely loves the craft.","rating":5},{"author":"Verified Google review","text":"Second-round adjustments were free of charge. Nobody does that anymore.","rating":5},{"author":"Verified Google review","text":"There's a real craftsmanship spirit here — clothes get fit to you, not the other way around.","rating":5}],
      "posts":[
        "Evening gown fit checklist: bust seams sit flat, no gap at the neckline, straps stay put through a full arm raise, waist hits your natural waist, hem clears the floor by a half-inch in your event shoes. Miss any of these and the dress will fight you all night — bring it in and we'll fix the ones that matter.",
        "Alteration pricing guide (average): pants hem $15–25, taper $30–50, suit jacket sleeves $30–50, dress hem $30–60, waist take-in $25–45, bridal alterations start at $150 and scale with the dress. Prices vary with fabric complexity — beading, lining and delicate silks take longer.",
        "When to size up and tailor down: if a piece fits you almost everywhere but pulls in one spot (shoulders, hips, chest), size up and let a tailor take in everything else. Letting fabric out is limited; taking it in is almost unlimited. Buy for the widest part and shape the rest."
      ]
    },
    {
      "username":"jordanmarket","name":"Jordan Market","category":"Persian Supermarket",
      "tagline":"Westwood's Persian supermarket — meat, produce & fresh bread",
      "address":"1449 Westwood Blvd","city":"Los Angeles, CA 90024","phone":"310-478-1706",
      "rating":"","reviews":"",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Jordan+Market+1449+Westwood+Blvd+Los+Angeles+CA+90024",
      "hours":{"monday":"8:30am-9pm","tuesday":"8:30am-9pm","wednesday":"8:30am-9pm","thursday":"8:30am-9pm","friday":"8:30am-9pm","saturday":"8:30am-9pm","sunday":"8:30am-8pm"},
      "services":[{"title":"Fresh Halal Meat","description":"Cut-to-order halal beef, lamb and chicken from the butcher counter."},{"title":"Persian Groceries","description":"Full aisle of Persian and Middle Eastern staples — rice, tea, spices, preserves."},{"title":"Produce","description":"Fresh produce including Persian herbs and hard-to-find specialty items."},{"title":"Fresh Bread & Lavash","description":"Fresh lavash and Persian breads brought in daily."},{"title":"Special Orders","description":"Special-order cuts and hard-to-find items ready next day."}],
      "testimonials":[{"author":"Verified Google review","text":"Special-ordered a whole leg of lamb — ready next day, cleaned and wrapped exactly how I asked.","rating":5},{"author":"Verified Google review","text":"Exactly the Middle Eastern specialty items you can't find anywhere else in the neighborhood.","rating":5},{"author":"Verified Google review","text":"The bread comes in fresh and disappears fast. Come early on weekends.","rating":5}],
      "posts":[
        "Persian pantry essentials to keep on hand: basmati rice, dried limes (limoo amani), turmeric, saffron, sumac, advieh, dried barberries (zereshk), pomegranate molasses and rose water. With these ten items you can make more than half the classic Persian repertoire — everything else is fresh produce and protein.",
        "Picking fresh lavash: it should be pale with a few darker spots, soft enough to fold without cracking, and smell faintly of yeast — not sour. If it snaps when you bend it, it's a day old. Our lavash comes in each morning; ask us what just landed before you buy.",
        "Special orders for gatherings: give us 24 hours and we can prep whole lamb, cut-to-spec cuts, family-size marinated proteins and bulk produce. For Nowruz, Ramadan and holiday meals, plan a few days ahead — we'll set aside what you need so you're not fighting the crowd."
      ]
    },
    {
      "username":"barberciaga","name":"Barberciaga Barber Shop","category":"Barbershop",
      "tagline":"Westwood's 4.9-star barbershop — open 7 days",
      "address":"2279 Westwood Blvd","city":"Los Angeles, CA 90064","phone":"424-443-1874",
      "rating":"4.9","reviews":"246",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Barberciaga+Barber+Shop+2279+Westwood+Blvd+Los+Angeles+CA+90064",
      "hours":{"monday":"8am-8pm","tuesday":"8am-8pm","wednesday":"8am-8pm","thursday":"8am-8pm","friday":"8am-8pm","saturday":"8am-8pm","sunday":"10am-5pm"},
      "services":[{"title":"Haircuts","description":"Classic and modern men's haircuts tailored to your hair and face shape."},{"title":"Fades","description":"Precision skin, low, mid and high fades with clean blends."},{"title":"Beard Work","description":"Beard shape-ups, line-ups and full trims."},{"title":"Kids Cuts","description":"Patient, friendly cuts for kids of every age."},{"title":"Long Hair & Scissor Work","description":"Detailed scissor cuts for longer styles and textured hair."}],
      "testimonials":[{"author":"Verified Google review","text":"Barbers here actually listen and nail the details — I don't have to fix anything at home.","rating":5},{"author":"Verified Google review","text":"My kids leave confident and happy every time. Big deal for us as parents.","rating":5},{"author":"Verified Google review","text":"Consistent every single visit — same clean fade, no surprises.","rating":5}],
      "posts":[
        "Fade guide: a skin fade goes all the way down to bare skin, a low fade starts just above the ear, a mid fade sits around the temple, and a high fade blends up near the top. Skin and high fades read bolder and more modern; low and mid read cleaner and easier to grow out. Ask your barber which suits your face shape.",
        "Kid's first haircut: come at a quieter time (weekday mornings usually work), let them sit on a parent's lap if that helps, and skip the surprise — talk it through before you walk in. We take our time and never rush a first cut. Bring a snack; leave with a happy kid.",
        "Scissor cut vs clippers: clippers give you clean, uniform length and are perfect for fades and short crops. Scissors give you texture, movement and softer lines, which is what longer styles need. Most great cuts use both — clippers for the sides and scissors on top."
      ]
    },
    {
      "username":"lostangelesbarber","name":"Lost Angeles Barber","category":"Barbershop",
      "tagline":"West Hollywood barbering, 7am to 8pm every day",
      "address":"8248 Santa Monica Blvd","city":"West Hollywood, CA 90046","phone":"310-487-0475",
      "rating":"5.0","reviews":"22",
      "maps_url":"https://www.google.com/maps/search/?api=1&query=Lost+Angeles+Barber+8248+Santa+Monica+Blvd+West+Hollywood+CA+90046",
      "hours":{"monday":"7am-8pm","tuesday":"7am-8pm","wednesday":"7am-8pm","thursday":"7am-8pm","friday":"7am-8pm","saturday":"7am-8pm","sunday":"7am-8pm"},
      "services":[{"title":"Haircuts & Fades","description":"Classic haircuts and precision fades for every hair type."},{"title":"Scissor Cuts","description":"Detailed scissor work for long and textured styles."},{"title":"Beard Sculpting","description":"Full beard shape-ups, line-ups and straight-razor detailing."},{"title":"Grooming Services","description":"Complete grooming including hot-towel finishes and neck shaves."}],
      "testimonials":[{"author":"Verified Google review","text":"Best haircut I've ever had — and I don't say that lightly.","rating":5},{"author":"Verified Google review","text":"Switched me from fades to a long scissor cut flawlessly. First shop that got the shape right.","rating":5},{"author":"Verified Google review","text":"Early hours that fit any schedule. I'm in and out before work — cannot beat it.","rating":5}],
      "posts":[
        "Early-morning grooming routine: 90 seconds is enough — a splash of cold water, a quick brush through the hair with a light cream (not gel), and a couple of drops of beard oil rubbed in cheeks-to-jaw. That's it. Save the full styling for evenings; mornings are about looking sharp fast.",
        "Fade maintenance: skin fades need a touch-up every 2 weeks to stay crisp, mid and low fades stretch to 3, longer styles can go 4–6 weeks between full cuts. If your neckline is fuzzing or the blend is losing its edge, book — don't wait until it bothers you in photos.",
        "Beard shaping guide: cheek line should follow the natural growth (a straight line from sideburn to mustache almost always looks best), neckline sits about two fingers above the Adam's apple, and the mustache should never fully cover the top lip. Trim every 5–7 days at home; leave the outlines to your barber."
      ]
    }
  ]$data$::jsonb;
  b jsonb;
  new_user_id uuid;
  new_profile_id uuid;
  seed_email text;
BEGIN
  FOR b IN SELECT * FROM jsonb_array_elements(bs) LOOP
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = b->>'username') THEN
      CONTINUE;
    END IF;

    seed_email := (b->>'username') || '+seed@uply.local';

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