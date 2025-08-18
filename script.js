const contenedorProductos = document.getElementById('productos');
const form = document.getElementById('form-agregar'); // id del formulario

// Cargar productos desde Supabase
async function cargarProductos() {
  const { data, error } = await supabaseClient.from('productos').select('*');
  if (error) {
    console.error('Error cargando productos:', error);
    return;
  }

  contenedorProductos.innerHTML = ""; // limpiar antes de renderizar
  data.forEach(producto => {
    crearCard(producto);
  });
}

// Crear card 
function crearCard(producto) {
  const div = document.createElement('div');
  div.classList.add('card');
  div.innerHTML = `
    <img src="${producto.img}" alt="${producto.nombre}" width="150">
    <h3>${producto.nombre}</h3>
  `;
  contenedorProductos.appendChild(div);

  // Abrir modal al hacer click en la card
  div.addEventListener('click', () => abrirModal(producto));
}

// Función para abrir modal
function abrirModal(producto) {
  const modalFondo = document.createElement('div');
  modalFondo.classList.add('modal-fondo');

  const modalContenido = document.createElement('div');
  modalContenido.classList.add('modal-contenido');
  modalContenido.innerHTML = `
    <span class="cerrar">&times;</span>

    <p>Preciox1: <span class="precio">Bs.${producto.precio_unid}</span> <button class="editar-precio-unid">✏️</button></p>
    <p>Preciox5: <span class="precio">Bs.${producto.preciox5 || "-"}</span> <button class="editar-preciox5">✏️</button></p>
    <p>Preciox10: <span class="precio">Bs.${producto.preciox10 || "-"}</span> <button class="editar-preciox10">✏️</button></p>
    <p>Preciox20: <span class="precio">Bs.${producto.preciox20 || "-"}</span> <button class="editar-preciox20">✏️</button></p>
    <p>Contiene: <span class="precio">${producto.cantidadxcaja || "-"}</span> <button class="editar-cantidadxcaja">✏️</button></p>
    <p>Stock: <span class="stock">${producto.stock}</span> <button class="btn-aumentar-stock">+</button></p>

    <div class="cantidad-control">
      <button class="btn-menos">-</button>
      <input type="number" class="cantidad" value="0" min="0">
      <button class="btn-mas">+</button>
      <button class="btn-confirmar">✔️ Confirmar</button>
    </div>

    <button class="btn-eliminar-modal">🗑️ Eliminar producto</button>
  `;

  modalFondo.appendChild(modalContenido);
  document.body.appendChild(modalFondo);

  // Cerrar modal
  modalContenido.querySelector('.cerrar').addEventListener('click', () => modalFondo.remove());
    
// Cerrar modal al hacer click fuera del contenido
modalFondo.addEventListener('click', (e) => {
  if (e.target === modalFondo) { // solo si se hace click en el fondo
    modalFondo.remove();
  }
});
  // --- Cantidad de compra ---
  const cantidadInput = modalContenido.querySelector('.cantidad');
  let cantidad = 0;
  function actualizarCantidad(val) {
    cantidad = Math.max(0, Math.min(parseInt(val) || 0, producto.stock));
    cantidadInput.value = cantidad;
  }

  modalContenido.querySelector('.btn-mas').addEventListener('click', () => actualizarCantidad(cantidad + 1));
  modalContenido.querySelector('.btn-menos').addEventListener('click', () => actualizarCantidad(cantidad - 1));
  cantidadInput.addEventListener('input', (e) => actualizarCantidad(e.target.value));

  // --- Confirmar compra ---
  modalContenido.querySelector('.btn-confirmar').addEventListener('click', async () => {
    if (cantidad === 0) { alert('Selecciona una cantidad antes de confirmar'); return; }
    if (cantidad > producto.stock) { alert('No hay suficiente stock'); return; }
    const { error } = await supabaseClient
      .from('productos')
      .update({ stock: producto.stock - cantidad })
      .eq('id', producto.id);

    if (!error) {
      producto.stock -= cantidad;
      modalFondo.remove();
      cargarProductos();
    }
  });

  // --- Botón para aumentar stock ---
  modalContenido.querySelector('.btn-aumentar-stock').addEventListener('click', async (e) => {
    e.stopPropagation();
    const cantidadSumar = parseInt(prompt('Ingresa la cantidad de stock a agregar:', '0'));
    if (isNaN(cantidadSumar) || cantidadSumar <= 0) {
      alert('Cantidad inválida');
      return;
    }

    const { error } = await supabaseClient
      .from('productos')
      .update({ stock: producto.stock + cantidadSumar })
      .eq('id', producto.id);

    if (!error) {
      producto.stock += cantidadSumar;
      modalContenido.querySelector('.stock').textContent = producto.stock;
    }
  });

  // --- Editar otros campos ---
  const campos = [
    { selector: '.editar-precio-unid', columna: 'precio_unid', valor: producto.precio_unid },
    { selector: '.editar-preciox5', columna: 'preciox5', valor: producto.preciox5 },
    { selector: '.editar-preciox10', columna: 'preciox10', valor: producto.preciox10 },
    { selector: '.editar-preciox20', columna: 'preciox20', valor: producto.preciox20 },
    { selector: '.editar-cantidadxcaja', columna: 'cantidadxcaja', valor: producto.cantidadxcaja }
  ];

  campos.forEach(c => {
    modalContenido.querySelector(c.selector).addEventListener('click', async (e) => {
      e.stopPropagation();
      const nuevoValor = prompt(`Nuevo valor para ${c.columna}:`, c.valor);
      if (nuevoValor !== null && !isNaN(nuevoValor)) {
        const { error } = await supabaseClient
          .from('productos')
          .update({ [c.columna]: parseFloat(nuevoValor) })
          .eq('id', producto.id);
        if (!error) {
          modalContenido.querySelector(c.selector).previousElementSibling.textContent = nuevoValor;
          c.valor = nuevoValor; // actualizar valor local
        }
      }
    });
  });

  // --- Eliminar producto ---
  modalContenido.querySelector('.btn-eliminar-modal').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm(`¿Deseas eliminar ${producto.nombre}?`)) {
      const { error } = await supabaseClient
        .from('productos')
        .delete()
        .eq('id', producto.id);
      if (!error) {
        modalFondo.remove();
        cargarProductos();
      }
    }
  });
}

// Agregar producto desde formulario
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('nombre').value;
  const precio_unid = parseFloat(document.getElementById('precioUnidad').value);
  const preciox5 = parseFloat(document.getElementById('precio5').value) || null;
  const preciox10 = parseFloat(document.getElementById('precio10').value) || null;
  const preciox20 = parseFloat(document.getElementById('precio20').value) || null;
  const cantidadxcaja = parseInt(document.getElementById('cantidadCaja').value) || null;
  const stock = parseInt(document.getElementById('stock').value);
  const img = document.getElementById('imagen').value;

  // Revisar si el producto ya existe
  const { data: existing, error } = await supabaseClient
    .from('productos')
    .select('*')
    .eq('nombre', nombre);

  if (error) { 
    console.error('Error verificando producto:', error); 
    return; 
  }

  if (existing && existing.length > 0) {
    // Ya existe, sumamos el stock
    const productoExistente = existing[0];
    const { error: errUpdate } = await supabaseClient
      .from('productos')
      .update({ stock: productoExistente.stock + stock })
      .eq('id', productoExistente.id);

    if (!errUpdate) {
      alert('Stock actualizado');
      form.reset();
      cargarProductos();
    }
  } else {
    // No existe, insertamos
    const { error: errInsert } = await supabaseClient
      .from('productos')
      .insert([{ nombre, precio_unid, preciox5, preciox10, preciox20, cantidadxcaja, stock, img }]);

    if (!errInsert) {
      alert('Producto agregado');
      form.reset();
      cargarProductos();
    }
  }
});

// Primera carga
cargarProductos();

