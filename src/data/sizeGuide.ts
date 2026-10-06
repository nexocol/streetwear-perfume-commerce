export const pantsSizeGuide={
  title:'Encuentra tu talla ideal',
  headers:['Talla','Cintura','Cadera','Tiro','Largo'],
  rows:[
    ['30','80 cm','100 cm','29 cm','105 cm'],
    ['32','82 cm','102 cm','31 cm','107 cm'],
    ['34','84 cm','104 cm','33 cm','109 cm'],
    ['36','86 cm','106 cm','35 cm','111 cm'],
    ['38','88 cm','108 cm','37 cm','113 cm'],
  ],
  note:'Medidas aproximadas tomadas con la prenda extendida. Puede existir una variación de ±1–2 cm.'
}

export const shirtSizeGuide={
  title:'Guía de tallas para camisetas',
  headers:['Talla','Estatura recomendada'],
  rows:[
    ['M','1,62–1,70 m'],
    ['L','1,70–1,79 m'],
    ['XL','1,79–1,86 m'],
    ['XXL','1,86 m en adelante'],
  ],
  note:'Referencia aproximada por estatura. El ajuste final también depende de la contextura y del fit de la prenda.'
}

export const hoodieSizeGuide={
  ...shirtSizeGuide,
  title:'Guía de tallas para buzos y sudaderas',
  rows:[['S','Consulta las medidas del modelo'],...shirtSizeGuide.rows],
  note:'Referencia general por estatura para prendas superiores. La talla S y el ajuste de cada buzo o sudadera requieren confirmar las medidas del modelo; solicita asesoría si tienes dudas.'
}

export const shortsSizeGuide={
  title:'Tallas de pantalonetas',
  headers:['Tallas del modelo'],
  rows:[['S · M · L · XL']],
  note:'No hay medidas de cintura, cadera o largo confirmadas para este modelo. Solicita asesoría para elegir la talla antes de comprar.'
}

export const sizeGuide=pantsSizeGuide
