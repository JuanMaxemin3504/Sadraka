import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export const loginUser = async (username, password) => {
  try {
    const q = query(collection(db, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("Usuario no encontrado");
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    if (password != userData.password) {
      console.log("Contraseña incorrecta");
      return null;
    }

    console.log("Inicio de sesión exitoso");
    
    return {
      id: userDoc.id,
      ...userData
    };
    
  } catch (error) {
    console.error("Error durante el inicio de sesión: ", error);
    return null;
  }
};
