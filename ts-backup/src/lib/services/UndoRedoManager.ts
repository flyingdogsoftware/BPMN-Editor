import { writable, get } from 'svelte/store';
import type { BpmnElementUnion } from '../models/bpmnElements';
import { bpmnStore } from '../stores/bpmnStore';

/**
 * UndoRedoManager
 * 
 * Verwaltet Undo/Redo-Funktionalität für den BPMN-Editor durch Speichern
 * vollständiger JSON-Snapshots des Diagrammzustands.
 */
export class UndoRedoManager {
  // Speicher für Zustände
  private undoStack: BpmnElementUnion[][] = [];
  private redoStack: BpmnElementUnion[][] = [];
  
  // Maximale Anzahl gespeicherter Zustände
  private maxStackSize: number = 50;
  
  // Flag, um zu verhindern, dass Undo/Redo-Operationen neue Snapshots erzeugen
  private isPerformingUndoRedo: boolean = false;
  
  // Stores für UI-Status
  private canUndoStore = writable<boolean>(false);
  private canRedoStore = writable<boolean>(false);
  
  // Debounce-Timer für Snapshot-Erstellung
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceDelay: number = 300; // ms
  
  constructor() {
    // Initialen Zustand speichern
    this.saveSnapshot();
    
    // Auf Änderungen im bpmnStore hören
    bpmnStore.subscribe((elements: BpmnElementUnion[]) => {
      // Snapshot speichern, wenn nicht gerade Undo/Redo ausgeführt wird
      if (!this.isPerformingUndoRedo) {
        this.debouncedSaveSnapshot();
      }
    });
  }
  
  /**
   * Aktuellen Zustand als Snapshot speichern
   */
  private saveSnapshot(): void {
    const currentElements = get(bpmnStore);
    
    // Deep copy erstellen, um Referenzen zu trennen
    const snapshot = JSON.parse(JSON.stringify(currentElements));
    
    this.undoStack.push(snapshot);
    
    // Redo-Stack leeren, da ein neuer Zustand erstellt wurde
    this.redoStack = [];
    
    // Stack-Größe begrenzen
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift(); // Ältesten Zustand entfernen
    }
    
    // UI-Status aktualisieren
    this.updateCanUndoRedo();
    
    console.log(`Snapshot gespeichert. Undo-Stack: ${this.undoStack.length}, Redo-Stack: ${this.redoStack.length}`);
  }
  
  /**
   * Snapshot-Erstellung mit Debouncing
   * Verhindert zu viele Snapshots bei schnellen Änderungen
   */
  private debouncedSaveSnapshot(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.saveSnapshot();
      this.debounceTimer = null;
    }, this.debounceDelay);
  }
  
  /**
   * Undo-Operation durchführen
   * @returns true wenn erfolgreich, false wenn kein Undo möglich
   */
  public undo(): boolean {
    if (this.undoStack.length <= 1) {
      return false; // Nichts zum Rückgängigmachen
    }
    
    // Aktuellen Zustand in Redo-Stack verschieben
    const currentState = this.undoStack.pop()!;
    this.redoStack.push(currentState);
    
    // Vorherigen Zustand wiederherstellen
    const previousState = this.undoStack[this.undoStack.length - 1];
    
    // Flag setzen, um zu verhindern, dass diese Änderung einen neuen Snapshot erzeugt
    this.isPerformingUndoRedo = true;
    
    // Store zurücksetzen und vorherigen Zustand wiederherstellen
    bpmnStore.reset();
    previousState.forEach(element => bpmnStore.addElement(element));
    
    // UI-Status aktualisieren
    this.updateCanUndoRedo();
    
    // Flag zurücksetzen
    setTimeout(() => {
      this.isPerformingUndoRedo = false;
    }, 0);
    
    console.log(`Undo durchgeführt. Undo-Stack: ${this.undoStack.length}, Redo-Stack: ${this.redoStack.length}`);
    return true;
  }
  
  /**
   * Redo-Operation durchführen
   * @returns true wenn erfolgreich, false wenn kein Redo möglich
   */
  public redo(): boolean {
    if (this.redoStack.length === 0) {
      return false; // Nichts zum Wiederherstellen
    }
    
    // Zustand aus Redo-Stack holen
    const nextState = this.redoStack.pop()!;
    this.undoStack.push(nextState);
    
    // Flag setzen, um zu verhindern, dass diese Änderung einen neuen Snapshot erzeugt
    this.isPerformingUndoRedo = true;
    
    // Store zurücksetzen und nächsten Zustand wiederherstellen
    bpmnStore.reset();
    nextState.forEach(element => bpmnStore.addElement(element));
    
    // UI-Status aktualisieren
    this.updateCanUndoRedo();
    
    // Flag zurücksetzen
    setTimeout(() => {
      this.isPerformingUndoRedo = false;
    }, 0);
    
    console.log(`Redo durchgeführt. Undo-Stack: ${this.undoStack.length}, Redo-Stack: ${this.redoStack.length}`);
    return true;
  }
  
  /**
   * Prüfen, ob Undo möglich ist
   */
  public canUndo(): boolean {
    return this.undoStack.length > 1;
  }
  
  /**
   * Prüfen, ob Redo möglich ist
   */
  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  /**
   * Stores für UI-Status aktualisieren
   */
  private updateCanUndoRedo(): void {
    this.canUndoStore.set(this.canUndo());
    this.canRedoStore.set(this.canRedo());
  }
  
  /**
   * Getter für canUndo Store
   */
  public getCanUndoStore() {
    return this.canUndoStore;
  }
  
  /**
   * Getter für canRedo Store
   */
  public getCanRedoStore() {
    return this.canRedoStore;
  }
  
  /**
   * Alle Zustände zurücksetzen
   */
  public reset(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.saveSnapshot(); // Aktuellen Zustand speichern
    this.updateCanUndoRedo();
  }
  
  /**
   * Beginnt eine Transaktion (Gruppierung von Änderungen)
   * Während einer Transaktion werden keine Snapshots erstellt
   */
  public beginTransaction(): void {
    this.isPerformingUndoRedo = true;
  }
  
  /**
   * Beendet eine Transaktion und erstellt einen Snapshot
   */
  public endTransaction(): void {
    this.isPerformingUndoRedo = false;
    this.saveSnapshot();
  }
}

// Singleton-Instanz erstellen und exportieren
export const undoRedoManager = new UndoRedoManager();
