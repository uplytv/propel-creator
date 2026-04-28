// Export SmartLink ad campaign briefs to platform-specific formats

export interface CampaignBrief {
  name: string;
  objective: string;
  daily_budget: number;
  total_budget?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  google_campaign_type?: string;
  audience: {
    age_min?: number;
    age_max?: number;
    genders?: ("male" | "female" | "all")[];
    countries?: string[];
    interests?: string[];
    behaviors?: string[];
    custom_audiences?: string[];
  };
  targeting: {
    placements?: string[];
    devices?: ("desktop" | "mobile")[];
    languages?: string[];
  };
  creative: {
    headline?: string;
    primary_text?: string;
    description?: string;
    cta?: string;
    image_url?: string;
    landing_url: string;
  };
}

const META_OBJECTIVES: Record<string, string> = {
  TRAFFIC: "OUTCOME_TRAFFIC",
  CONVERSIONS: "OUTCOME_SALES",
  REACH: "OUTCOME_AWARENESS",
  VIDEO_VIEWS: "OUTCOME_AWARENESS",
  ENGAGEMENT: "OUTCOME_ENGAGEMENT",
  APP_INSTALLS: "OUTCOME_APP_PROMOTION",
};

export function buildMetaBrief(b: CampaignBrief) {
  return {
    campaign: {
      name: b.name,
      objective: META_OBJECTIVES[b.objective] || "OUTCOME_TRAFFIC",
      special_ad_categories: [],
      status: "PAUSED",
      buying_type: "AUCTION",
    },
    ad_set: {
      name: `${b.name} — Ad Set`,
      daily_budget: Math.round(b.daily_budget * 100), // cents
      ...(b.total_budget ? { lifetime_budget: Math.round(b.total_budget * 100) } : {}),
      ...(b.start_date ? { start_time: b.start_date } : {}),
      ...(b.end_date ? { end_time: b.end_date } : {}),
      billing_event: "IMPRESSIONS",
      optimization_goal:
        b.objective === "CONVERSIONS" ? "OFFSITE_CONVERSIONS" : "LINK_CLICKS",
      targeting: {
        age_min: b.audience.age_min ?? 18,
        age_max: b.audience.age_max ?? 65,
        genders:
          b.audience.genders?.includes("all") || !b.audience.genders?.length
            ? [1, 2]
            : b.audience.genders.map((g) => (g === "male" ? 1 : 2)),
        geo_locations: { countries: b.audience.countries ?? ["US"] },
        flexible_spec:
          b.audience.interests?.length || b.audience.behaviors?.length
            ? [
                {
                  ...(b.audience.interests?.length
                    ? { interests: b.audience.interests.map((name) => ({ name })) }
                    : {}),
                  ...(b.audience.behaviors?.length
                    ? { behaviors: b.audience.behaviors.map((name) => ({ name })) }
                    : {}),
                },
              ]
            : undefined,
        ...(b.audience.custom_audiences?.length
          ? { custom_audiences: b.audience.custom_audiences.map((id) => ({ id })) }
          : {}),
        publisher_platforms: Array.from(
          new Set(
            (b.targeting.placements ?? []).map((p) => p.split("_")[0])
          )
        ).filter((p) => ["facebook", "instagram", "audience_network", "messenger"].includes(p)),
        ...(b.targeting.languages?.length ? { locales: b.targeting.languages } : {}),
        device_platforms: b.targeting.devices ?? ["mobile", "desktop"],
      },
    },
    ad_creative: {
      name: `${b.name} — Creative`,
      object_story_spec: {
        link_data: {
          message: b.creative.primary_text ?? "",
          link: b.creative.landing_url,
          name: b.creative.headline ?? "",
          description: b.creative.description ?? "",
          ...(b.creative.image_url ? { picture: b.creative.image_url } : {}),
          call_to_action: { type: b.creative.cta || "LISTEN_NOW" },
        },
      },
    },
    _instructions:
      "Import via Meta Ads Manager → Create Campaign → use these specs. Campaign starts PAUSED.",
  };
}

export function buildGoogleCSV(b: CampaignBrief): string {
  const campaignType = b.google_campaign_type || "Performance Max";
  const rows = [
    ["Campaign", "Campaign Type", "Status", "Budget", "Bid Strategy Type", "Networks", "Languages"],
    [
      b.name,
      campaignType,
      "Paused",
      b.daily_budget.toString(),
      "Maximize Clicks",
      campaignType === "Search" ? "Google Search" : "All",
      (b.targeting.languages ?? ["en"]).join(";"),
    ],
    [],
    ["Ad Group", "Campaign", "Status", "Default max. CPC"],
    [`${b.name} — Group 1`, b.name, "Paused", "1.00"],
    [],
    ["Ad", "Campaign", "Ad Group", "Headline 1", "Headline 2", "Description 1", "Final URL"],
    [
      `${b.name} — Ad`,
      b.name,
      `${b.name} — Group 1`,
      b.creative.headline?.slice(0, 30) ?? "",
      b.creative.description?.slice(0, 30) ?? "",
      b.creative.primary_text?.slice(0, 90) ?? "",
      b.creative.landing_url,
    ],
  ];
  return rows
    .map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

// TikTok requires numeric location IDs (not ISO codes). Top markets covered;
// unknown ISO codes are dropped silently.
const TIKTOK_COUNTRY_IDS: Record<string, number> = {
  US: 6252001, CA: 6251999, GB: 2635167, AU: 2077456, DE: 2921044, FR: 3017382,
  MX: 3996063, BR: 3469034, JP: 1861060, ES: 2510769, IT: 3175395, NL: 2750405,
  SE: 2661886, KR: 1835841, IN: 1269750, PH: 1694008, ID: 1643084, SG: 1880251,
};

const TIKTOK_OBJECTIVES: Record<string, string> = {
  TRAFFIC: "TRAFFIC",
  CONVERSIONS: "CONVERSIONS",
  REACH: "REACH",
  VIDEO_VIEWS: "VIDEO_VIEWS",
  ENGAGEMENT: "ENGAGEMENT",
  APP_INSTALLS: "APP_PROMOTION",
};

export function buildTikTokBrief(b: CampaignBrief) {
  return {
    campaign: {
      campaign_name: b.name,
      objective_type: TIKTOK_OBJECTIVES[b.objective] || "TRAFFIC",
      budget_mode: "BUDGET_MODE_DAY",
      budget: b.daily_budget,
      operation_status: "DISABLE",
    },
    adgroup: {
      adgroup_name: `${b.name} — AdGroup`,
      placement_type: "PLACEMENT_TYPE_AUTOMATIC",
      promotion_type: "WEBSITE",
      ...(b.start_date ? { schedule_start_time: b.start_date } : {}),
      ...(b.end_date ? { schedule_end_time: b.end_date } : {}),
      budget_mode: "BUDGET_MODE_DAY",
      budget: b.daily_budget,
      bid_type: "BID_TYPE_NO_BID",
      billing_event: "CPC",
      pacing: "PACING_MODE_SMOOTH",
      audience: {
        location_ids: (b.audience.countries ?? [])
          .map((c) => TIKTOK_COUNTRY_IDS[c])
          .filter((v): v is number => typeof v === "number"),
        age_groups: ageRangeToTikTok(b.audience.age_min, b.audience.age_max),
        gender:
          b.audience.genders?.includes("all") || !b.audience.genders?.length
            ? "GENDER_UNLIMITED"
            : b.audience.genders[0] === "male"
            ? "GENDER_MALE"
            : "GENDER_FEMALE",
        languages: b.targeting.languages ?? [],
        interest_keywords: b.audience.interests ?? [],
      },
    },
    ad: {
      ad_name: `${b.name} — Ad`,
      ad_format: "SINGLE_IMAGE",
      ad_text: b.creative.primary_text ?? "",
      landing_page_url: b.creative.landing_url,
      ...(b.creative.image_url ? { image_url: b.creative.image_url } : {}),
      call_to_action: b.creative.cta || "LISTEN_NOW",
    },
    _instructions:
      "Import via TikTok Ads Manager → Campaign → paste these specs. Starts DISABLED.",
  };
}

function ageRangeToTikTok(min?: number, max?: number): string[] {
  const all = [
    { id: "AGE_13_17", lo: 13, hi: 17 },
    { id: "AGE_18_24", lo: 18, hi: 24 },
    { id: "AGE_25_34", lo: 25, hi: 34 },
    { id: "AGE_35_44", lo: 35, hi: 44 },
    { id: "AGE_45_54", lo: 45, hi: 54 },
    { id: "AGE_55_100", lo: 55, hi: 100 },
  ];
  const lo = min ?? 18;
  const hi = max ?? 65;
  return all.filter((b) => b.hi >= lo && b.lo <= hi).map((b) => b.id);
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
