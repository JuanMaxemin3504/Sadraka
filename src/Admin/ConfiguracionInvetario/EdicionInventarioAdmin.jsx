import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import NavBarInventario from '../NavBars/NavBarInventario';

const urlImagenBlanco = "https://tse3.mm.bing.net/th/id/OIP.0nEFZ6umUtwq2FJce32emgHaE8?rs=1&pid=ImgDetMain";

let url = "";

function EdicionInventarioAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [ingreso, setIngreso] = useState("KG");
  const [costo, setCosto] = useState("");
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cantidadPaquete, setCantidadPaquete] = useState(""); // Nuevo estado para la cantidad unitaria por paquete

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  useEffect(() => {
    const loadProduct = async () => {
      const productRef = doc(db, "products", id);
      const productSnap = await getDoc(productRef);

      if (productSnap.exists()) {
        const productData = productSnap.data();
        setNombre(productData.nombre);
        setCantidad(productData.cantidad.toString());
        setIngreso(productData.ingreso);
        setCosto(productData.costo);
        setCantidadPaquete(productData.cantidad_paquete || ""); // Cargar cantidad_paquete si existe
        url = productData.url;
      } else {
        alert("Producto no encontrado.");
        navigate("/inventario");
      }
    };

    loadProduct();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nombre || !cantidad || !costo) {
      alert("Por favor, completa todos los campos y selecciona una imagen.");
      return;
    }

    if (file && !file.type.startsWith("image/")) {
      alert("Por favor, sube solo archivos de imagen.");
      return;
    }

    if (ingreso === "KG") {
      if (isNaN(parseFloat(cantidad))) {
        alert("La cantidad debe ser un número válido.");
        return;
      }

      if (parseFloat(cantidad) < 0) {
        alert("La cantidad no debe ser negativa");
        return;
      }
    } else if (ingreso === "Paquetes") {
      if (!Number.isInteger(parseFloat(cantidad))) {
        alert("La cantidad debe ser un número entero.");
        return;
      }

      if (parseInt(cantidad) < 0) {
        alert("La cantidad no debe ser negativa");
        return;
      }

      if (!cantidadPaquete || !Number.isInteger(parseFloat(cantidadPaquete))) {
        alert("La cantidad unitaria por paquete debe ser un número entero.");
        return;
      }

      if (parseInt(cantidadPaquete) <= 0) {
        alert("La cantidad unitaria por paquete debe ser mayor a 0.");
        return;
      }
    } else {
      if (!Number.isInteger(parseFloat(cantidad))) {
        alert("La cantidad debe ser un número entero.");
        return;
      }

      if (parseInt(cantidad) < 0) {
        alert("La cantidad no debe ser negativa");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let downloadUrl = "";
      if (file) {
        if (url != urlImagenBlanco) {
          // Se obtiene la url de la imagen para poder eliminarla
          const startIndex = url.indexOf("/o/") + 3;
          const endIndex = url.indexOf("?alt=media");
          const encodedFilePath = url.substring(startIndex, endIndex);
          const filePath = decodeURIComponent(encodedFilePath);
          const fileRef = ref(storage, filePath);
          // Se elimina la imagen del storage con la url obtenida
          try {
            await deleteObject(fileRef);
            console.log("Archivo eliminado correctamente.");
          } catch (error) {
            console.error("Error al eliminar el archivo:", error);
          }
        }
        // Se sube la nueva imagen
        const storageRef = ref(storage, `productos/${file.name}`);
        await uploadBytes(storageRef, file);
        downloadUrl = await getDownloadURL(storageRef);

        // Se edita los datos del producto en caso de cambiar la imagen
        const productRef = doc(db, "products", id);
        await updateDoc(productRef, {
          nombre: nombre,
          cantidad: parseFloat(cantidad),
          ingreso: ingreso,
          costo: costo,
          url: downloadUrl,
          cantidad_paquete: ingreso === "Paquetes" ? parseInt(cantidadPaquete) : null, // Guardar cantidad_paquete solo si el tipo de ingreso es "Paquetes"
        });
      } else {
        // Se edita los datos del producto en caso de no haber cambio en la imagen
        const productRef = doc(db, "products", id);
        await updateDoc(productRef, {
          nombre: nombre,
          cantidad: parseFloat(cantidad),
          ingreso: ingreso,
          costo: costo,
          cantidad_paquete: ingreso === "Paquetes" ? parseInt(cantidadPaquete) : null, // Guardar cantidad_paquete solo si el tipo de ingreso es "Paquetes"
        });
      }
      alert("Producto actualizado correctamente.");
      navigate("/inventario");
    } catch (error) {
      console.error("Error al actualizar el producto:", error);
      alert("Hubo un error al actualizar el producto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <NavBarInventario />
      <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
        <h2>Editar Producto</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label>Nombre del Producto:</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Cantidad:</label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              step={ingreso === "KG" ? "0.01" : "1"}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Costo por {ingreso === "KG" ? "KG" : "unidad"}</label>
            <input
              type="number"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              step={"0.01"}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Tipo de Ingreso:</label>
            <select
              value={ingreso}
              onChange={(e) => setIngreso(e.target.value)}
              required
              style={{ width: "100%", padding: "8px" }}
            >
              <option value="KG">KG</option>
              <option value="Unidades">Unidades</option>
              <option value="Paquetes">Paquetes</option>
            </select>
          </div>

          {ingreso === "Paquetes" && ( //Se muestra solo si el ingreso es paquetes
            <div style={{ marginBottom: "15px" }}>
              <label>Cantidad unitaria por paquete:</label>
              <input
                type="number"
                value={cantidadPaquete}
                onChange={(e) => setCantidadPaquete(e.target.value)}
                step="1"
                required
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
          )}

          <div style={{ marginBottom: "15px" }}>
            <label>Imagen del Producto:</label>
            <input
              type="file"
              onChange={handleFileChange}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: isSubmitting ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EdicionInventarioAdmin;