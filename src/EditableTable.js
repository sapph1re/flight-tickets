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
import { withStyles } from '@material-ui/core/styles';

const CustomTableCell = withStyles(theme => ({
  head: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white
  },
  body: {
    fontSize: 14
  }
}))(TableCell);


class EditableTable extends React.Component {

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
      return dataRow[dataColumn.prop];
    }
  };

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

  renderTableBody() {
    const { data, dataStructure } = this.props;

    return data.map((dataRow, rowIdx) => {
      if (dataRow.disabled) {
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
            <CustomTableCell />
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
            <CustomTableCell>
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
            <CustomTableCell>Actions</CustomTableCell>
          </TableRow>
        </TableHead>
        <TableBody>{this.renderTableBody()}</TableBody>
      </Table>
    );
  }
}

export default EditableTable;
