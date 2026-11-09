function requestPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

export async function getCurrentLocation(): Promise<GeolocationPosition> {
  if (!window.isSecureContext) {
    throw new Error('Akses lokasi memerlukan HTTPS atau localhost. Buka situs melalui koneksi yang aman.')
  }
  if (!navigator.geolocation) {
    throw new Error('Perangkat atau browser ini tidak mendukung deteksi lokasi. Ketik titik asal secara manual.')
  }

  try {
    return await requestPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
  } catch (error) {
    // A denied permission cannot be fixed by retrying. Other failures may recover
    // using the device's network location or a recent cached position.
    if ((error as GeolocationPositionError).code === 1) throw error
    return requestPosition({ enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 })
  }
}

export function locationErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  const code = (error as GeolocationPositionError | null)?.code
  if (code === 1) {
    return 'Izin lokasi diblokir. Buka pengaturan situs di sebelah alamat browser, izinkan Lokasi, lalu coba lagi. Pastikan layanan lokasi perangkat aktif.'
  }
  if (code === 2) {
    return 'Lokasi perangkat belum tersedia. Aktifkan layanan lokasi dan koneksi internet, lalu coba lagi atau ketik titik asal.'
  }
  if (code === 3) {
    return 'Pencarian lokasi melewati batas waktu. Periksa layanan lokasi dan koneksi internet, lalu coba lagi atau ketik titik asal.'
  }
  return 'Lokasi tidak dapat diakses. Coba lagi atau ketik titik asal secara manual.'
}
