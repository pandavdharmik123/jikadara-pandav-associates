import React, { createContext, useContext } from 'react';

/**
 * Input language mode for the Pedhinamu builder.
 *  - 'ghanshyam': inputs accept/display Ghanshyam legacy keystrokes (default, existing behaviour)
 *  - 'unicode'  : inputs accept/display Gujarati Unicode directly
 *
 * NOTE: This ONLY controls the input encoding. The preview/print documents always
 * display Ghanshyam/Nilkanth legacy text (they convert Unicode → legacy on render).
 */
export const PedhinamuInputModeContext = createContext('ghanshyam');

export const usePedhinamuInputMode = () => useContext(PedhinamuInputModeContext);
