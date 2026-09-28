// Configuración de pestañas y secciones del micrositio.
// Módulo aparte para que lo lean tanto la interfaz (app.js) como el script que
// arma el conocimiento del asistente (scripts/build-chat-knowledge.mjs).

export const TABS = [
  {
    id: 'dashboard-nacional',
    label: 'Nacional',
    title: 'Datos nacionales',
    downloadLabel: 'Descarga datos',
    downloadHref: 'data/dashboard-nacional/Datos_monitor_nacionales.xlsx',
    downloadFilename: 'Datos_monitor_nacionales.xlsx',
    sections: [
      {
        key: 'participacion-global',
        type: 'world-map-ranking',
        title: ' La participación económica de las mujeres en México se ubica por debajo del nivel mundial',
        subtitle: 'Tasa de participación económica de las mujeres por país',
        file: '/api/data?s=participacion_global',
        layout: 'map-ranking'
      },
      {
        key: 'evolucion-tpe',
        type: 'line',
        title: 'La participación de las mujeres en el mercado laboral ha cambiado poco en los últimos 20 años',
        subtitle: 'Evolución nacional de la tasa de participación económica por sexo',
        file: '/api/data?s=tpe_historica',
        source: 'Fuente: Elaborado por el IMCO con datos del tercer trimestre de la Encuesta Nacional de Ocupación y Empleo (ENOE) del INEGI de 2005 a 2025.',
        chartHeightScale: .8
      },
      {
        key: 'brecha-salarial-genero',
        type: 'line',
        title: 'Por cada 100 pesos que gana un hombre, una mujer percibe en promedio 86 pesos',
        subtitle: 'Evolución de la brecha salarial por género en México',
        source: 'Fuente: Elaborado por el IMCO con el promedio de los cuatro trimestres de la Encuesta Nacional de Ocupación y Empleo (ENOE) del INEGI de 2005 a 2025.',
        file: '/api/data?s=brecha_salarial',
        cta: { label: 'Explora la brecha salarial a detalle', tab: 'brecha-salarial' },
        width: 'half',
        chartHeightScale: 1.35
      },
      {
        key: 'informalidad-laboral-sexo',
        type: 'line',
        title: 'Actualmente la diferencia entre hombres y mujeres en la informalidad se encuentra en niveles similares a 2005',
        subtitle: 'Porcentaje de trabajadores en la informalidad por sexo',
        source: 'Nota: Se considera la tasa de informalidad con respecto a la población ocupada no agropecuaria (TIL2). Fuente: Elaborado por el IMCO con el dato trimestral de la Encuesta Nacional de Ocupación y Empleo (ENOE) del INEGI de 2005 a 2025.',
        file: '/api/data?s=informalidad',
        width: 'half',
        chartHeightScale: 1.28
      },
      {
        key: 'valor-cuidados',
        type: 'stacked-bars',
        title: ' El trabajo del hogar y de cuidados equivale a 24% de la economía nacional',
        subtitle: 'Trabajo no remunerado de los hogares como porcentaje del PIB (pesos corrientes)',
        file: '/api/data?s=valor_cuidados'
      }
    ]
  },
  {
    id: 'estadisticas-entidad',
    label: 'Estatal',
    title: 'Estados #ConLupaDeGénero',
    downloadLabel: 'Descargas las boletas',
    downloadHref: 'data/estadisticas-entidad/Boletas_Estados-ConLupaDeGenero-2026.pdf',
    downloadFilename: 'Boletas_Estados-ConLupaDeGenero-2026.pdf',
    sections: [
      {
        key: 'mapa-indicadores-entidad',
        type: 'mexico-indicator-map',
        title: 'Indicadores por entidad',
        subtitle: 'Selecciona un indicador de la lista desplegable',
        file: '/api/data?s=entidad_enriched',
        layout: 'indicator-map'
      }
    ]
  },
  {
    id: 'cdmx-alcaldia',
    label: 'CDMX',
    title: 'Mujeres jóvenes en la CDMX',
    pill: 'Alcaldías CDMX',
    downloadLabel: 'Descargas las boletas',
    downloadHref: 'https://imco.org.mx/monitor/wp-content/uploads/2026/02/Boletas_Mujeres-CDMX-2025_22092025.pdf',
    downloadFilename: 'Boletas_Mujeres-CDMX-2025_22092025.pdf',
    sections: [
      {
        key: 'mapa-indicadores-cdmx',
        type: 'cdmx-indicator-map',
        title: 'Indicadores por alcaldía',
        subtitle: 'Selecciona un indicador, o compara varios a la vez.',
        file: '/api/data?s=cdmx_indicadores',
        layout: 'indicator-map'
      }
    ]
  },
  {
    id: 'stem',
    label: 'STEM',
    title: 'Mujeres en STEM',
    subtitle: 'Ciencia, Tecnología, Ingeniería y Matemáticas',
    pill: 'STEM+',
    downloadLabel: 'Descarga datos',
    downloadHref: 'data/stem/Datos_monitor_stem.xlsx',
    downloadFilename: 'Datos_monitor_stem.xlsx',
    brandLogoSrc: '/logos/stem-plus-white-horizontal.png',
    brandLogoAlt: 'Movimiento STEM+',
    sections: [
      {
        key: 'stem-pisa-historico',
        type: 'line',
        title: 'México registra una tendencia a la baja en el desempeño en matemáticas, comprensión lectora y ciencias',
        subtitle: 'Histórico de puntajes obtenidos por México entre 2003 y 2022',
        file: '/api/data?s=stem',
        width: 'half',
        chartHeightScale: 1.2
      },
      {
        key: 'stem-nivel-matematicas',
        type: 'stem-nivel-matematicas',
        title: 'Una de cada mil jóvenes aplica razonamiento matemático a problemas complejos',
        subtitle: 'Nivel de desempeño en matemáticas por sexo',
        file: '/api/data?s=stem',
        width: 'half'
      },
      {
        key: 'stem-matricula-area',
        type: 'stem-matricula-area',
        title: 'En México de cada tres estudiantes en carreras STEM una es mujer',
        subtitle: 'Distribución de matrícula de hombres y mujeres por área de estudio',
        file: 'data/stem/monitor_stem.json'
      },
      {
        key: 'stem-map-matricula',
        type: 'stem-map',
        title: 'San Luis Potosí es la entidad donde más mujeres estudiantes eligen una carrera STEM',
        subtitle: 'Proporción de mujeres que estudian una carrera STEM respecto al total de alumnas',
        file: '/api/data?s=stem',
        graphId: 'mapa_matricula_stem',
        width: 'half'
      },
      {
        key: 'stem-map-profesionistas',
        type: 'stem-map',
        title: 'Coahuila y Querétaro lideran a nivel nacional. 18% de las mujeres profesionistas trabajan en STEM',
        subtitle: 'Proporción de profesionistas STEM respecto al total de profesionistas por estado',
        file: '/api/data?s=stem',
        graphId: 'mapa_profesionistas_stem',
        width: 'half'
      },
      {
        key: 'stem-mercado-laboral',
        type: 'stem-mercado-laboral',
        title: 'Mujeres egresadas de carreras STEM acceden a mejores beneficios laborales.',
        subtitle: 'Indicadores del mercado laboral para mujeres por área de estudios',
        file: 'data/stem/monitor_stem.json'
      }
    ]
  },
  {
    id: 'brecha-salarial',
    label: 'Brecha salarial',
    title: 'Brecha salarial',
    // La descarga responde a la selección del explorador (ver brecha.js).
    downloadAction: 'dynamic',
    downloadLabel: 'Descarga datos',
    sections: [
      {
        key: 'brecha-salarial',
        type: 'brecha-story',
        file: '/api/data?s=monitor_brecha'
      }
    ]
  },
  {
    id: 'investigaciones',
    label: 'Investigaciones',
    title: 'Investigaciones',
    subtitle: 'Conoce nuestras investigaciones más recientes sobre las mujeres en la economía.',
    sections: [
      {
        key: 'investigaciones',
        type: 'investigaciones',
        file: 'data/investigaciones/investigaciones.json'
      }
    ]
  }
];
