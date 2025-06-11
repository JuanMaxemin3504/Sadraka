import { collection, getDocs, getDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase"; // Asegúrate de importar tu configuración de Firebase

export const ValidacionIngredientesPlatillos = (id) => {
    const bloquear = verificarStockCero(id)
    let platillosAfectados = []
    if(bloquear){
        platillosAfectados = bloquearPlatillosPorIngrediente(id);
    }
    return platillosAfectados;
}


async function verificarStockCero(ingredienteId) {
  try {
    // Obtener el documento del ingrediente
    const ingredienteRef = doc(db, "products", ingredienteId);
    const ingredienteDoc = await getDoc(ingredienteRef);

    if (!ingredienteDoc.exists()) {
      console.error("Ingrediente no encontrado");
      return false; // Consideramos que si no existe, no hay stock
    }

    const cantidad = ingredienteDoc.data().cantidad || 0;
    
    if(cantidad <= 0 || ingredienteDoc.data().baja == true || ingredienteDoc.data().estatus == false)
        return true;

    return false;
    
  } catch (error) {
    console.error("Error al verificar el stock:", error);
    return false; // En caso de error, asumimos que no hay stock disponible
  }
}

async function bloquearPlatillosPorIngrediente(ingredienteId) {
    const platillosBloqueados = [];
    const batch = writeBatch(db);
  
    try {
      const menuRef = collection(db, "menu");
      const querySnapshot = await getDocs(menuRef);
  
      querySnapshot.forEach((doc) => {
        const platilloData = doc.data();
        const tieneIngrediente = platilloData.ingredientes?.some(
          ing => ing.id === ingredienteId
        );
  
        if (tieneIngrediente) {
          platillosBloqueados.push({
            id: doc.id,
            nombre: platilloData.nombre,
            bloqueo: true
          });
  
          batch.update(doc.ref, { 
            bloqueo: true,
            motivoBloqueo: `Contiene ingrediente agotado (ID: ${ingredienteId})`,
            ultimaActualizacion: new Date()
          });
        }
      });
  
      if (platillosBloqueados.length > 0) {
        await batch.commit();
      }
  
      return platillosBloqueados;
  
    } catch (error) {
      console.error("Error al bloquear platillos:", error);
      throw error;
    }
  }