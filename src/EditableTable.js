import React from 'react';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import IconButton from '@material-ui/core/IconButton';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import CircularProgress from '@material-ui/core/CircularProgress';
import { withStyles } from '@material-ui/core/styles';

// Customizing the look of the table cells
const CustomTableCell = withStyles(theme => ({
  head: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
    fontSize: 14
  },
  body: {
    fontSize: 15
  }
}))(TableCell);

/**
 * A table with data that can be edited.
 * This is a stateless component. Make sure to maintain the data in your state outside.
 * @param data - the data to be displayed in the table
 * @param dataErrors - the errors to be displayed when in the edit mode
 * @param dataStructure - list of data columns, each must include:
 *  - string name: the column name to be displayed
 *  - string prop: must be same as the corresponding key in "data"
 *  - boolean editable: whether this data can be edited or not
 *  - string errorProp: must be same as the corresponding key in "dataErrors";
 *  this parameter can be skipped when "editable" is false
 * @param editIdx - index of the row currently being edited, -1 means edit mode is off
 * @param handleChange - function to be called whenever an input is changed (in edit mode)
 * @param startEditing - function to be called when edit mode is turned on
 * @param finishEditing - function to be called to submit the edited data
 * @param cancelEditing - function to be called to cancel editing and quit the edit mode
 * @param handleRemove - function to be called to remove a row from the data
 */
class EditableTable extends React.Component {

  /** Render the table header with given data columns */
  renderHeaderRow() {
    const { dataStructure } = this.props;

    return dataStructure.map((dataColumn, columnIdx) => {
      return (
        <CustomTableCell key={`thc-${columnIdx}`}>
          {dataColumn.name}
        </CustomTableCell>
      );
    });
  }

  /**
   * Render a field with data, an editable text field when in edit mode
   * and just a plain text otherwise
   */
  renderEditableField(dataColumn, dataRow, rowIdx) {
    const { editIdx, dataErrors, handleChange } = this.props;

    if (dataColumn.editable && editIdx === rowIdx) {
      return (
        <TextField
          name={dataColumn.prop}
          value={dataRow[dataColumn.prop]}
          onChange={(e) => handleChange(e, dataColumn.prop, rowIdx)}
          label={dataColumn.name}
          helperText={dataErrors[dataColumn.errorProp]}
          error={dataErrors[dataColumn.errorProp] && dataErrors[dataColumn.errorProp].length > 0}
          fullWidth={true}
        />
      );
    } else {
      return dataRow[dataColumn.prop].toString();
    }
  };

  /** Render buttons "edit", "remove", "save", "cancel" depending on the mode */
  renderActionButtons(rowIdx) {
    const { editIdx, startEditing, finishEditing, cancelEditing, handleRemove } = this.props;

    return (
      <div>
        {editIdx === rowIdx ? (
          <span>
            <Tooltip title="Save">
              <IconButton color="primary" onClick={() => finishEditing()}>
                <CheckIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cancel">
              <IconButton color="primary" onClick={() => cancelEditing()}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </span>
        ) : (
            <Tooltip title="Edit">
              <IconButton color="primary" onClick={() => startEditing(rowIdx)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
          )}
        <Tooltip title="Delete">
          <IconButton color="primary" onClick={() => handleRemove(rowIdx)}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </div>
    );
  }

  /** Render the table body with all the data, editable data fields and action buttons */
  renderTableBody() {
    const { data, dataStructure } = this.props;

    return data.map((dataRow, rowIdx) => {
      if (dataRow.inProgress) {
        return (
          <TableRow
            key={`tr-${rowIdx}`}
            className="row-disabled"
          >
            {dataStructure.map((dataColumn, columnIdx) => (
              <CustomTableCell key={`trc-${columnIdx}`}>
                {dataRow[dataColumn.prop]}
              </CustomTableCell>
            ))}
            <CustomTableCell style={{ textAlign: 'center' }}>
              <CircularProgress size={20} />
            </CustomTableCell>
          </TableRow>
        );
      } else {
        return (
          <TableRow key={`tr-${rowIdx}`}>
            {dataStructure.map((dataColumn, columnIdx) => (
              <CustomTableCell key={`trc-${columnIdx}`}>
                {this.renderEditableField(dataColumn, dataRow, rowIdx)}
              </CustomTableCell>
            ))}
            <CustomTableCell style={{ textAlign: 'center' }}>
              {this.renderActionButtons(rowIdx)}
            </CustomTableCell>
          </TableRow>
        );
      }
    });
  }

  render() {
    return (
      <Table>
        <TableHead>
          <TableRow>
            {this.renderHeaderRow()}
            <CustomTableCell style={{ textAlign: 'center' }}>
              Actions
            </CustomTableCell>
          </TableRow>
        </TableHead>
        <TableBody>{this.renderTableBody()}</TableBody>
      </Table>
    );
  }
}

export default EditableTable;
