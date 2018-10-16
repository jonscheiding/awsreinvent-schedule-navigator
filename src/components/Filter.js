import React, { Component } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

import LabeledInput from './LabeledInput';
import FilterHeader, { Buttons } from './FilterHeader';

const ColorLabel = styled.div`
  display: ${p => p.color !== undefined ? 'inline-block' : 'none'};
  width: 1em;
  height: 1em;
  background-color: ${p => p.color};
  border-radius: 5px;
`;

class Filter extends Component {
  render() {
    const { filter, filterKey, className, style } = this.props;

    return (
      <div className={className} style={style}>
        <FilterHeader>
          {filterKey}
          <Buttons>
            <button value='true' onClick={this.handleAllFiltersChange}>All</button>
            <button value='false' onClick={this.handleAllFiltersChange}>None</button>
          </Buttons>
        </FilterHeader>
        {filter.map(f => 
          <LabeledInput 
            key={f.value || ''} type='checkbox' 
            checked={f.isSelected} onChange={this.handleFilterChange(f.value)}>
            <ColorLabel color={f.color} />
            {f.value || <i>Unknown</i>}
          </LabeledInput>
        )}
      </div>
    );
  }

  handleFilterChange = (value) => (e) => {
    this.props.onFilterChange(value, e.target.checked);
  }

  handleAllFiltersChange = (e) => {
    this.props.onAllFiltersChange(e.target.value === 'true');
  }
}

Filter.propTypes = {
  className: PropTypes.string,
  style: PropTypes.string,
  filter: PropTypes.arrayOf(PropTypes.object).isRequired,
  filterKey: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func,
  onAllFiltersChange: PropTypes.func
};

Filter.defaultProps = {
  filter: [],
  onFilterChange: () => {},
  onAllFiltersChange: () => {}
};

export default Filter;
