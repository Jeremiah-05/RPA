try { [xml] = Get-Content -Raw " E:\RPA 1\rpa\UiPath_Workflow_Files\Main.xaml\; Write-Host \SUCCESS: Valid XML Root=\ .DocumentElement.Name } catch { Write-Error }
