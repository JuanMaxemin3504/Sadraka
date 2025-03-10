import React, { useEffect, useState } from "react";
import { db, storage } from "../../firebase";
import { collection, query, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import NavBarInventario from '../NavBars/NavBarInventario';
import { Link } from "react-router-dom";
import { deleteObject, ref } from "firebase/storage";

    { /* 
        Tipo 0 = Meseros
        Tipo 1 = Cocinas
        Tipo 2 = Cliente
    */}

function UsuariosAdmin() {
    return (
        <div>

        </div>
    )
}

export default UsuariosAdmin
