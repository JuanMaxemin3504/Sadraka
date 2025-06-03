export const MetodoDeOrdenamiento = (ordenes) => {
    const ordenesOrdenadas = [...ordenes];
    let cambios = true;
  
    const MaxCiclos = ordenesOrdenadas.length;
    let ciclo = 0;

    while (MaxCiclos > ciclo) {
      cambios = false;
  
      for (let i = ordenesOrdenadas.length - 1; i > 0; i--) {
        const ordenActual = ordenesOrdenadas[i];
        const ordenAnterior = ordenesOrdenadas[i - 1];
  
        if (puedeAdelantar(ordenAnterior, ordenActual)) {
          [ordenesOrdenadas[i], ordenesOrdenadas[i - 1]] = [ordenesOrdenadas[i - 1], ordenesOrdenadas[i]];
          cambios = true;
        }
      }

      ciclo++
    }
  
    return ordenesOrdenadas;
  };
  
  function puedeAdelantar(ordenAdelantar, ordenActual) {
    const tiempoEsperaAdelantar = calcularTiempoEspera(ordenAdelantar.fecha);
    const tiempoEsperaActual = calcularTiempoEspera(ordenActual.fecha);
    console.log("Actual: " + ordenActual.puntos);
    console.log("Siguiente: " + ordenAdelantar.puntos);
    console.log("Activa: " + ordenAdelantar.preparando );


    if(ordenAdelantar.preparando == true) {
      return null;
    }
  
    // Criterio 1: Más puntos y orden adelantada lleva menos de 15 mins
    if( ordenAdelantar.puntos > ordenActual.puntos && 
        tiempoEsperaActual < 15 )
        return true;
    
    // Criterio 2: Mitad de platillos y lleva menos de 15 mins
    const totalPlatillosAdelantar = calcularTotalPlatillos(ordenAdelantar);
    const totalPlatillosActual = calcularTotalPlatillos(ordenActual);
    
    if( totalPlatillosAdelantar * 2 <= totalPlatillosActual && 
        tiempoEsperaAdelantar < 15)
        return true;
    
    return false;
  }
  
  function calcularTiempoEspera(fechaOrden) {
    if (!fechaOrden) return 0;
    const fecha = fechaOrden.toDate ? fechaOrden.toDate() : new Date(fechaOrden);
    const ahora = new Date();
    const diferenciaMs = ahora - fecha;
    return Math.floor(diferenciaMs / (1000 * 60));
  }
  
  function calcularTotalPlatillos(orden) {
    const platillosNormales = orden.platillos?.length || 0;
    const platillosExtras = orden.extrasYcomplementos?.length || 0;
    const platillosPromociones = orden.promociones?.reduce(
      (total, promo) => total + (promo.platillos?.length || 0), 0
    ) || 0;
    
    return platillosNormales + platillosPromociones + platillosExtras;
  }