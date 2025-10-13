"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  Activity,
  Shirt,
  Package,
  Lightbulb,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface WeatherRecommendation {
  weather_condition: string
  temperature: number
  location: string
  activities: {
    recommended: string[]
    weather_specific: string[]
  }
  clothing: {
    essential: string[]
    temperature_specific: string[]
  }
  tips: {
    weather: string[]
    temperature: string[]
    general: string[]
  }
  packing_suggestions: {
    essential: string[]
    weather_specific: string[]
  }
}

interface WeatherRecommendationsProps {
  recommendations: WeatherRecommendation[]
  className?: string
}

export function WeatherRecommendations({
  recommendations,
  className,
}: WeatherRecommendationsProps) {
  const [expanded, setExpanded] = useState(false)

  if (!recommendations || recommendations.length === 0) {
    return null
  }

  const mainRecommendation = recommendations[0]

  return (
    <div
      className={cn(
        "bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 my-4 border border-emerald-100",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-emerald-800 flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Weather-Smart Recommendations
        </h4>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          <span className="text-sm font-medium">
            {expanded ? "Show Less" : "Show More"}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Quick Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 border border-emerald-100">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-emerald-800 text-sm">
              Top Activities
            </span>
          </div>
          <ul className="text-sm text-gray-700 space-y-1">
            {mainRecommendation.activities.recommended
              .slice(0, 3)
              .map((activity, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-emerald-500 mt-1">•</span>
                  <span>{activity}</span>
                </li>
              ))}
          </ul>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 border border-emerald-100">
          <div className="flex items-center gap-2 mb-2">
            <Shirt className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-emerald-800 text-sm">
              What to Wear
            </span>
          </div>
          <ul className="text-sm text-gray-700 space-y-1">
            {mainRecommendation.clothing.essential
              .slice(0, 3)
              .map((item, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-emerald-500 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
          </ul>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 border border-emerald-100">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-emerald-800 text-sm">
              Pack Essentials
            </span>
          </div>
          <ul className="text-sm text-gray-700 space-y-1">
            {mainRecommendation.packing_suggestions.essential
              .slice(0, 3)
              .map((item, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-emerald-500 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/* Weather Tips */}
      <div className="bg-gray-50 rounded-lg p-3 border border-emerald-100">
        <h5 className="font-medium text-emerald-800 mb-2">Weather Tips</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {mainRecommendation.tips.weather
            .concat(mainRecommendation.tips.temperature)
            .map((tip, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <span className="text-emerald-500 mt-1 text-xs">💡</span>
                <span>{tip}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-emerald-100 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 border border-emerald-100">
              <h5 className="font-medium text-emerald-800 mb-3">
                All Recommended Activities
              </h5>
              <ul className="text-sm text-gray-700 space-y-2">
                {mainRecommendation.activities.recommended.map(
                  (activity, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-1">•</span>
                      <span>{activity}</span>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 border border-emerald-100">
              <h5 className="font-medium text-emerald-800 mb-3">
                Complete Packing List
              </h5>
              <div className="space-y-3">
                <div>
                  <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Essential Items
                  </h6>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {mainRecommendation.clothing.essential.map(
                      (item, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-emerald-500 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
                <div>
                  <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Weather-Specific
                  </h6>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {mainRecommendation.packing_suggestions.weather_specific.map(
                      (item, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-emerald-500 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 border border-emerald-100">
            <h5 className="font-medium text-emerald-800 mb-3">
              All Tips & Insights
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Weather-Specific
                </h6>
                <ul className="text-sm text-gray-700 space-y-1">
                  {mainRecommendation.tips.weather.map((tip, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-blue-500 mt-1">☁️</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Temperature
                </h6>
                <ul className="text-sm text-gray-700 space-y-1">
                  {mainRecommendation.tips.temperature.map((tip, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-red-500 mt-1">🌡️</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  General
                </h6>
                <ul className="text-sm text-gray-700 space-y-1">
                  {mainRecommendation.tips.general.map((tip, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-emerald-500 mt-1">💡</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
