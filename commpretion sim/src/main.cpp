#include "simulation.hpp"

#include <iomanip>
#include <iostream>
#include <limits>

namespace {

double read_positive(const char* prompt) {
    double value = 0.0;
    for (;;) {
        std::cout << prompt;
        if (std::cin >> value && std::isfinite(value) && value > 0.0) {
            return value;
        }
        if (std::cin.eof()) {
            throw std::runtime_error("Input berakhir sebelum semua ukuran dimasukkan.");
        }
        std::cout << "Masukkan angka yang lebih besar dari nol.\n";
        std::cin.clear();
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
    }
}

} // namespace

int main() {
    try {
        const combustion::Dimensions dimensions{
            read_positive("Diameter silinder (mm): "),
            read_positive("Langkah piston (mm): "),
            read_positive("Volume ruang sisa (cm3): ")
        };
        const combustion::Results results = combustion::calculate(dimensions);

        std::cout << std::fixed << std::setprecision(2)
                  << "\nVolume langkah per silinder : " << results.displacement_cm3 << " cm3\n"
                  << "Volume total per silinder   : " << results.total_volume_cm3 << " cm3\n"
                  << "Rasio kompresi             : " << results.compression_ratio << " : 1\n"
                  << "\nSudut engkol (derajat, 0-720): ";
        double angle = 0.0;
        if (std::cin >> angle && std::isfinite(angle) && angle >= 0.0 && angle <= 720.0) {
            std::cout << "Volume sesaat               : "
                      << combustion::instantaneous_volume_cm3(dimensions, angle) << " cm3\n";
        } else if (!std::cin.eof()) {
            std::cerr << "Sudut engkol harus berada dalam rentang 0-720 derajat.\n";
            return 1;
        }
    } catch (const std::exception& error) {
        std::cerr << "Kesalahan: " << error.what() << '\n';
        return 1;
    }
    return 0;
}
