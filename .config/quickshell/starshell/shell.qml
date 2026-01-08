import Quickshell
import QtQuick

PanelWindow {
  anchors {
    top: true
    left: true
    right: true
  }

  implicitHeight: 30

  Text {
    // center the bar in its parent component (the window)
    anchors.centerIn: parent

    text: "hello world"
  }
}
