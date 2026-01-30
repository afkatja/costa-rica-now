// Filter enums for iteration and type safety
export enum TimeFilter {
  All = "allTime",
  Last24Hours = "24h",
  Last3Days = "3d",
  Week = "week",
  Month = "month",
}

export enum SourceFilter {
  All = "allSources",
  USGS = "usgs",
  OVSICORI = "ovsicori",
  RSN = "rsn",
  Manual = "manual",
}
