#pragma once

#include <algorithm>
#include <cmath>
#include <limits>
#include <stdexcept>

namespace combustion {

struct Dimensions {
    double bore_mm;
    double stroke_mm;
    double clearance_cm3;
};

struct Results {
    double displacement_cm3;
    double total_volume_cm3;
    double compression_ratio;
};

inline Results calculate(const Dimensions& dimensions) {
    if (!std::isfinite(dimensions.bore_mm) || dimensions.bore_mm <= 0.0 ||
        !std::isfinite(dimensions.stroke_mm) || dimensions.stroke_mm <= 0.0 ||
        !std::isfinite(dimensions.clearance_cm3) || dimensions.clearance_cm3 <= 0.0) {
        throw std::invalid_argument("Semua ukuran harus berupa angka positif yang valid.");
    }

    const long double displacement =
        (std::acos(-1.0L) / 4.0L) *
        static_cast<long double>(dimensions.bore_mm) * dimensions.bore_mm *
        dimensions.stroke_mm / 1000.0L;
    if (!std::isfinite(displacement) ||
        displacement > std::numeric_limits<double>::max()) {
        throw std::invalid_argument("Volume langkah berada di luar rentang yang dapat dihitung.");
    }

    const double displacement_cm3 = static_cast<double>(displacement);
    const double total_volume = displacement_cm3 + dimensions.clearance_cm3;
    if (!std::isfinite(total_volume)) {
        throw std::invalid_argument("Volume total berada di luar rentang yang dapat dihitung.");
    }

    const double compression_ratio = total_volume / dimensions.clearance_cm3;
    if (!std::isfinite(compression_ratio)) {
        throw std::invalid_argument("Rasio kompresi berada di luar rentang yang dapat dihitung.");
    }

    return {displacement_cm3, total_volume, compression_ratio};
}

inline double piston_travel_fraction(double crank_angle_degrees,
                                    double connecting_rod_to_crank_ratio = 3.5) {
    if (!std::isfinite(crank_angle_degrees) ||
        !std::isfinite(connecting_rod_to_crank_ratio) ||
        connecting_rod_to_crank_ratio <= 0.0) {
        throw std::invalid_argument("Sudut engkol atau rasio batang penghubung tidak valid.");
    }

    const double pi = std::acos(-1.0);
    const double angle = std::fmod(crank_angle_degrees, 360.0) * pi / 180.0;
    const double sine = std::sin(angle);
    const double ratio_squared = connecting_rod_to_crank_ratio * connecting_rod_to_crank_ratio;
    const double root = std::sqrt(std::max(0.0, ratio_squared - sine * sine));
    const double travel_fraction =
        (1.0 - std::cos(angle) + connecting_rod_to_crank_ratio - root) / 2.0;
    return std::clamp(travel_fraction, 0.0, 1.0);
}

inline double instantaneous_volume_cm3(const Dimensions& dimensions,
                                       double crank_angle_degrees) {
    const Results results = calculate(dimensions);
    return dimensions.clearance_cm3 +
           results.displacement_cm3 * piston_travel_fraction(crank_angle_degrees);
}

} // namespace combustion
