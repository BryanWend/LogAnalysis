Attribute VB_Name = "Module2"
Option Explicit
  
  
Sub Example()
    Dim folderPath As String, fileName As String
    Dim fileData As String, parsedDataArray() As String
    Dim aggregatedData() As String
    Dim arrayIndex As Long, oldUBound As Long, i As Long
    Dim lastRowDestination As Long
    Dim finalRowCount As Long
      
    'Set folder path
    folderPath = ActiveWorkbook.Sheets("Data").Range("B1").Value
  
    'Get first filename
    fileName = Dir(folderPath & "*.csv")
      
    'Initialize
    arrayIndex = 0
    finalRowCount = 0
    ReDim aggregatedData(0 To 0)
  
    Do While fileName <> ""
      
        'Circumvent Excel 64000 array limit, this will paste the batch data and reset the variables
        If UBound(aggregatedData) >= 58000 Then
            lastRowDestination = ActiveWorkbook.Sheets("Data").Range("A1").SpecialCells(xlCellTypeLastCell).Row
            'Track where to put data
            finalRowCount = finalRowCount + oldUBound
            'Paste first batch
            Range("A" & lastRowDestination + 1 & ":A" & finalRowCount + 1).Value = Application.Transpose(aggregatedData)
            'Reset variables and aggregated array data
            Erase aggregatedData
            arrayIndex = 0
            oldUBound = 0
        End If
              
        Open folderPath & fileName For Binary As #1
        fileData = Space$(LOF(1))
        Get #1, , fileData
        Close #1
          
        'Parse single file's data into an array
        parsedDataArray() = Split(fileData, vbCrLf)
        'Resize the array to account for new data
        ReDim Preserve aggregatedData(oldUBound + UBound(parsedDataArray) + 1)
        oldUBound = UBound(aggregatedData)
  

   
    'Add file data line items to aggregated data array
        For i = LBound(parsedDataArray) To UBound(parsedDataArray)
            If (parsedDataArray(i) <> "") Then
                aggregatedData(arrayIndex) = parsedDataArray(i) & ":" & fileName
                'Fix line breaks and/or carriage returns
                aggregatedData(arrayIndex) = Replace(aggregatedData(arrayIndex), Chr(13), "")
                'Remove file extension
                aggregatedData(arrayIndex) = Left(aggregatedData(arrayIndex), Len(aggregatedData(arrayIndex)) - 4)
            Else
                aggregatedData(arrayIndex) = parsedDataArray(i)
            End If
            arrayIndex = arrayIndex + 1
        Next i
        Debug.Print fileName
        'Set next filename in folder
        fileName = Dir
  
    Loop
  
    'Print final leftover array to the worksheet
    ActiveWorkbook.Sheets("Data").Range("A" & lastRowDestination + 1 & ":A" & lastRowDestination + oldUBound).Value = Application.Transpose(aggregatedData)
    'Delete blank rows
    ActiveWorkbook.Sheets("Data").Columns("A").SpecialCells(xlCellTypeBlanks).EntireRow.Delete
      
    'Find the last cell with data in it
    lastRowDestination = ActiveWorkbook.Sheets("Data").Range("A1").SpecialCells(xlCellTypeLastCell).Row
      
    'Split the data into separate columns
    'By Fixed Width first
    ActiveWorkbook.Sheets("Data").Range("A3:A" & lastRowDestination).TextToColumns Destination:=Range("A3"), DataType:=xlFixedWidth, _
        FieldInfo:=Array(Array(0, 1), Array(11, 1), Array(29, 1), Array(32, 1)), _
        TrailingMinusNumbers:=True
          
    'Delimited by colon second
    ActiveWorkbook.Sheets("Data").Range("D3:D" & lastRowDestination).TextToColumns Destination:=Range("D3"), DataType:=xlDelimited, _
        TextQualifier:=xlDoubleQuote, Other:=True, OtherChar _
        :=":", FieldInfo:=Array(Array(1, 1), Array(2, 1)), TrailingMinusNumbers:=True
              
    'Delete extra column after text-to-columns
    ActiveWorkbook.Sheets("Data").Range("C:C").Delete
      
End Sub


