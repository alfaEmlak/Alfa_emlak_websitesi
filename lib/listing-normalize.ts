/**
 * Normalize Supabase snake_case data to camelCase for frontend use
 */
export function normalizeListing(row: any): any {
  if (!row) return null;
  
  return {
    ...row,
    // Core fields
    listingId: row.listing_id ?? row.listingId,
    propertyType: row.property_type ?? row.propertyType,
    fullAddress: row.full_address ?? row.fullAddress,
    shortDescription: row.description_tr ?? row.short_description ?? row.shortDescription,
    longDescription: row.description_en ?? row.long_description ?? row.longDescription,
    coverImage: row.cover_image ?? row.coverImage,
    images: row.listing_images ?? row.images,
    
    // Property details
    areaM2: row.area_m2 ?? row.areaM2,
    plotAreaM2: row.plot_area_m2 ?? row.plotAreaM2,
    buildingAge: row.building_age ?? row.buildingAge,
    livingRooms: row.living_rooms ?? row.livingRooms,
    hasPool: row.has_pool ?? row.hasPool,
    hasGarden: row.has_garden ?? row.hasGarden,
    hasFireplace: row.has_fireplace ?? row.hasFireplace,
    hasParking: row.has_parking ?? row.hasParking,
    seaView: row.sea_view ?? row.seaView,
    detailFields: row.detail_fields ?? row.detailFields,
    
    // Media
    virtualTourUrl: row.virtual_tour_url ?? row.virtualTourUrl,
    virtualTourEnabled: row.virtual_tour_enabled ?? row.virtualTourEnabled,
    videoUrl: row.video_url ?? row.videoUrl,
    videoEnabled: row.video_enabled ?? row.videoEnabled,
    
    // Location
    lat: row.latitude ?? row.lat,
    lng: row.longitude ?? row.lng,
    mapEnabled: row.map_enabled ?? row.mapEnabled,
    
    // Nearby
    nearbyPlaces: row.nearby_places ?? row.nearbyPlaces,
    nearbyEnabled: row.nearby_enabled ?? row.nearbyEnabled,
    nearbyPoiCategoriesJson: row.nearby_poi_categories_json ?? row.nearbyPoiCategoriesJson,
    
    // Consultant
    consultantName: row.consultant_name ?? row.consultantName,
    consultantPhone: row.consultant_phone ?? row.consultantPhone,
    consultantWhatsapp: row.consultant_whatsapp ?? row.consultantWhatsapp,
    consultantEmail: row.consultant_email ?? row.consultantEmail,
    consultantOffice: row.consultant_office ?? row.consultantOffice,
    consultantPhoto: row.consultant_photo ?? row.consultantPhoto,
    consultantOfficeLogo: row.consultant_office_logo ?? row.consultantOfficeLogo,
    
    // Stats
    statsShowViews: row.stats_show_views ?? row.statsShowViews,
    statsShowFavs: row.stats_show_favs ?? row.statsShowFavs,
    statsShowRating: row.stats_show_rating ?? row.statsShowRating,
    
    // Timestamps
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    
    // Publish status
    publishStatus: row.publish_status ?? row.publishStatus,
    createdByAgentId: row.created_by_agent_id ?? row.createdByAgentId,
    createdByName: row.created_by_name ?? row.createdByName,
    approvalSubmittedAt: row.approval_submitted_at ?? row.approvalSubmittedAt,
    approvedByName: row.approved_by_name ?? row.approvedByName,
    approvedAt: row.approved_at ?? row.approvedAt,
    rejectedByName: row.rejected_by_name ?? row.rejectedByName,
    rejectedAt: row.rejected_at ?? row.rejectedAt,
    
    // Badges (stored as JSON string)
    badgeFeatured: typeof row.badges === "string" ? JSON.parse(row.badges).featured : row.badges?.featured ?? row.badgeFeatured,
    badgeExclusive: typeof row.badges === "string" ? JSON.parse(row.badges).exclusive : row.badges?.exclusive ?? row.badgeExclusive,
    badgeVirtualTour: typeof row.badges === "string" ? JSON.parse(row.badges).virtualTour : row.badges?.virtualTour ?? row.badgeVirtualTour,
    badgeVideo: typeof row.badges === "string" ? JSON.parse(row.badges).video : row.badges?.video ?? row.badgeVideo,
    badgeNew: typeof row.badges === "string" ? JSON.parse(row.badges).new : row.badges?.new ?? row.badgeNew,
    badgePriceDrop: typeof row.badges === "string" ? JSON.parse(row.badges).priceDrop : row.badges?.priceDrop ?? row.badgePriceDrop,
    
    // Features (stored as JSON array)
    features: Array.isArray(row.features) ? JSON.stringify(row.features) : row.features,

    // 101evler XML feed entegrasyonu
    exportTo101evler: row.export_to_101evler ?? row.exportTo101evler ?? false,
    ext101evler: row.ext_101evler ?? row.ext101evler ?? null,
  };
}

export function normalizeListings(rows: any[]): any[] {
  return rows.map(normalizeListing);
}
